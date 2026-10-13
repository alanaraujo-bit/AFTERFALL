/**
 * Operações de progresso do usuário. Recebem a instância do banco para serem testáveis.
 * Cada mutação devolve um snapshot do estado anterior, usado pelo "Desfazer".
 */
import type { AfterfallDB } from './db';
import {
  DEFAULT_SETTINGS,
  type EpisodeId,
  type UserSettings,
  type WatchProgress,
  type WatchStatus,
} from '@/domain/types';

export interface Snapshot {
  rows: Array<{ episodeId: EpisodeId; before: WatchProgress | undefined }>;
}

const blank = (episodeId: EpisodeId): WatchProgress => ({
  episodeId,
  status: 'unwatched',
  favorite: false,
  completedAt: null,
  note: '',
  updatedAt: 0,
});

/** Remove linhas que não carregam informação (não assistido, sem favorito, sem nota). */
const isEmpty = (p: WatchProgress) => p.status === 'unwatched' && !p.favorite && !p.note;

async function writeRows(db: AfterfallDB, rows: WatchProgress[]) {
  const keep = rows.filter((r) => !isEmpty(r));
  const drop = rows.filter(isEmpty).map((r) => r.episodeId);
  if (keep.length) await db.progress.bulkPut(keep);
  if (drop.length) await db.progress.bulkDelete(drop);
}

export async function getSettings(db: AfterfallDB): Promise<UserSettings> {
  const stored = await db.settings.get('user');
  return { ...DEFAULT_SETTINGS, ...stored, id: 'user' };
}

export async function updateSettings(db: AfterfallDB, patch: Partial<Omit<UserSettings, 'id'>>) {
  // Transação rw: alterações rápidas em sequência não sobrescrevem umas às outras.
  return db.transaction('rw', db.settings, async () => {
    const current = await getSettings(db);
    const next = { ...current, ...patch, id: 'user' as const };
    await db.settings.put(next);
    return next;
  });
}

export async function setStatus(
  db: AfterfallDB,
  ids: readonly EpisodeId[],
  status: WatchStatus,
  now: Date = new Date(),
): Promise<Snapshot> {
  return db.transaction('rw', db.progress, db.sessions, async () => {
    const existing = await db.progress.bulkGet([...ids]);
    const snapshot: Snapshot = { rows: [] };
    const rows: WatchProgress[] = [];
    const changed: EpisodeId[] = [];
    ids.forEach((episodeId, i) => {
      const before = existing[i];
      snapshot.rows.push({ episodeId, before });
      const base = before ?? blank(episodeId);
      if (base.status === status) return;
      changed.push(episodeId);
      rows.push({
        ...base,
        status,
        completedAt: status === 'completed' ? now.toISOString() : null,
        updatedAt: now.getTime(),
      });
    });
    await writeRows(db, rows);
    if (changed.length) {
      const action = status === 'completed' ? 'complete' : status === 'in_progress' ? 'start' : 'uncomplete';
      await db.sessions.add({ action, episodeIds: changed, at: now.toISOString() });
    }
    return snapshot;
  });
}

export async function toggleFavorite(db: AfterfallDB, id: EpisodeId): Promise<Snapshot> {
  return db.transaction('rw', db.progress, async () => {
    const before = await db.progress.get(id);
    const base = before ?? blank(id);
    await writeRows(db, [{ ...base, favorite: !base.favorite }]);
    return { rows: [{ episodeId: id, before }] };
  });
}

export async function setNote(db: AfterfallDB, id: EpisodeId, note: string) {
  await db.transaction('rw', db.progress, async () => {
    const base = (await db.progress.get(id)) ?? blank(id);
    await writeRows(db, [{ ...base, note: note.slice(0, 2000) }]);
  });
}

/** Restaura o estado anterior a uma mutação (Desfazer). */
export async function restoreSnapshot(db: AfterfallDB, snapshot: Snapshot) {
  await db.transaction('rw', db.progress, async () => {
    const put = snapshot.rows.flatMap((r) => (r.before ? [r.before] : []));
    const del = snapshot.rows.filter((r) => !r.before).map((r) => r.episodeId);
    if (put.length) await db.progress.bulkPut(put);
    if (del.length) await db.progress.bulkDelete(del);
  });
}

export async function resetProgress(db: AfterfallDB, now: Date = new Date()) {
  await db.transaction('rw', db.progress, db.sessions, async () => {
    await db.progress.clear();
    await db.sessions.clear();
    await db.sessions.add({ action: 'reset', episodeIds: [], at: now.toISOString() });
  });
}
