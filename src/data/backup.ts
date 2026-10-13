/**
 * Backup em JSON: exportação, validação, prévia de conflitos e importação (mesclar/substituir).
 * Nada é sobrescrito sem que o chamador escolha explicitamente o modo.
 */
import { z } from 'zod';
import { migrateProgressV1, SCHEMA_VERSION, type AfterfallDB } from './db';
import { DEFAULT_SETTINGS, type UserSettings, type WatchProgress, type WatchSession } from '@/domain/types';

export const BACKUP_APP = 'afterfall';

const progressV2 = z.object({
  episodeId: z.string().min(1).max(80),
  status: z.enum(['unwatched', 'in_progress', 'completed']),
  favorite: z.boolean(),
  completedAt: z.string().nullable(),
  note: z.string().max(2000),
  updatedAt: z.number().finite().nonnegative(),
});

const progressV1 = z.object({
  episodeId: z.string().min(1).max(80),
  watched: z.boolean(),
  watchedAt: z.string().nullable(),
});

const session = z.object({
  action: z.enum(['complete', 'uncomplete', 'start', 'reset', 'import']),
  episodeIds: z.array(z.string()),
  at: z.string(),
});

const settings = z
  .object({
    theme: z.enum(['dark', 'light', 'system']),
    orderMode: z.enum(['chronological', 'release']),
    includeExtras: z.boolean(),
    motion: z.enum(['system', 'reduced', 'full']),
    spoilerShield: z.boolean(),
    onboardingDone: z.boolean(),
    timelineDensity: z.enum(['detailed', 'compact']),
  })
  .partial();

const envelope = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  appVersion: z.string().optional(),
});

const backupV2 = envelope.extend({
  schemaVersion: z.literal(2),
  progress: z.array(progressV2),
  sessions: z.array(session).default([]),
  settings: settings.optional(),
});

const backupV1 = envelope.extend({
  schemaVersion: z.literal(1),
  progress: z.array(progressV1),
  settings: settings.optional(),
});

export interface Backup {
  app: typeof BACKUP_APP;
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  appVersion?: string;
  progress: WatchProgress[];
  sessions: Omit<WatchSession, 'id'>[];
  settings?: Partial<Omit<UserSettings, 'id'>>;
}

export async function exportBackup(db: AfterfallDB, appVersion?: string, now = new Date()): Promise<Backup> {
  const [progress, sessions, stored] = await Promise.all([
    db.progress.toArray(),
    db.sessions.orderBy('at').toArray(),
    db.settings.get('user'),
  ]);
  const { id: _id, ...prefs } = { ...DEFAULT_SETTINGS, ...stored };
  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    appVersion,
    progress,
    sessions: sessions.map(({ id: _sid, ...s }) => s),
    settings: prefs,
  };
}

export type ParseResult = { ok: true; backup: Backup; migratedFrom?: number } | { ok: false; error: string };

/** Valida e migra um backup para o schema atual. Nunca lança. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  const head = envelope.safeParse(raw);
  if (!head.success) return { ok: false, error: 'Este arquivo não é um backup do AFTERFALL.' };
  if (head.data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'Backup criado por uma versão mais nova do app. Atualize o AFTERFALL e tente de novo.' };
  }
  if (head.data.schemaVersion === 1) {
    const v1 = backupV1.safeParse(raw);
    if (!v1.success) return { ok: false, error: 'Backup corrompido (formato v1 inválido).' };
    return {
      ok: true,
      migratedFrom: 1,
      backup: {
        ...v1.data,
        schemaVersion: SCHEMA_VERSION,
        progress: v1.data.progress.map(migrateProgressV1),
        sessions: [],
      },
    };
  }
  const v2 = backupV2.safeParse(raw);
  if (!v2.success) return { ok: false, error: 'Backup corrompido: alguns registros estão em formato inválido.' };
  return { ok: true, backup: { ...v2.data, schemaVersion: SCHEMA_VERSION } };
}

export interface ImportPreview {
  incoming: number;
  incomingCompleted: number;
  current: number;
  currentCompleted: number;
  /** Episódios presentes nos dois lados com estado diferente. */
  conflicts: number;
  /** IDs do backup que não existem no catálogo atual (serão preservados, mas não exibidos). */
  unknownIds: string[];
  exportedAt: string;
}

const sameState = (a: WatchProgress, b: WatchProgress) =>
  a.status === b.status && a.favorite === b.favorite && a.note === b.note;

export async function previewImport(db: AfterfallDB, backup: Backup, knownIds: ReadonlySet<string>): Promise<ImportPreview> {
  const current = await db.progress.toArray();
  const byId = new Map(current.map((p) => [p.episodeId, p]));
  let conflicts = 0;
  for (const p of backup.progress) {
    const mine = byId.get(p.episodeId);
    if (mine && !sameState(mine, p)) conflicts++;
  }
  return {
    incoming: backup.progress.length,
    incomingCompleted: backup.progress.filter((p) => p.status === 'completed').length,
    current: current.length,
    currentCompleted: current.filter((p) => p.status === 'completed').length,
    conflicts,
    unknownIds: backup.progress.map((p) => p.episodeId).filter((id) => !knownIds.has(id)),
    exportedAt: backup.exportedAt,
  };
}

/**
 * Mesclar: para cada episódio fica o registro alterado mais recentemente; favoritos e notas
 * nunca são perdidos (favorito = OU lógico, nota mais recente não vazia).
 * Substituir: o progresso atual é trocado pelo do backup.
 */
export function mergeProgress(current: WatchProgress[], incoming: WatchProgress[]): WatchProgress[] {
  const out = new Map(current.map((p) => [p.episodeId, p]));
  for (const p of incoming) {
    const mine = out.get(p.episodeId);
    if (!mine) {
      out.set(p.episodeId, p);
      continue;
    }
    const newer = p.updatedAt > mine.updatedAt ? p : mine;
    const older = newer === p ? mine : p;
    out.set(p.episodeId, {
      ...newer,
      favorite: mine.favorite || p.favorite,
      note: newer.note || older.note,
    });
  }
  return [...out.values()];
}

export async function applyImport(db: AfterfallDB, backup: Backup, mode: 'merge' | 'replace', now = new Date()) {
  await db.transaction('rw', db.progress, db.sessions, db.settings, async () => {
    const current = await db.progress.toArray();
    const next = mode === 'replace' ? backup.progress : mergeProgress(current, backup.progress);
    await db.progress.clear();
    await db.progress.bulkPut(next);
    if (mode === 'replace') await db.sessions.clear();
    const key = (s: Omit<WatchSession, 'id'>) => `${s.action}|${s.at}|${s.episodeIds.join(',')}`;
    const existing = new Set((await db.sessions.toArray()).map(key));
    const fresh = backup.sessions.filter((s) => !existing.has(key(s)));
    if (fresh.length) await db.sessions.bulkAdd(fresh.map((s) => ({ ...s })));
    await db.sessions.add({ action: 'import', episodeIds: [], at: now.toISOString() });
    if (mode === 'replace' && backup.settings) {
      const stored = await db.settings.get('user');
      await db.settings.put({ ...DEFAULT_SETTINGS, ...stored, ...backup.settings, onboardingDone: true, id: 'user' });
    }
  });
}

export function backupFileName(now = new Date()) {
  return `afterfall-backup-${now.toISOString().slice(0, 10)}.json`;
}
