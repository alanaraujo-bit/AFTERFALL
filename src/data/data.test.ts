import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createDB, SCHEMA_VERSION, type AfterfallDB } from './db';
import { getSettings, resetProgress, restoreSnapshot, setNote, setStatus, toggleFavorite, updateSettings } from './progressRepo';
import { applyImport, exportBackup, mergeProgress, parseBackup, previewImport } from './backup';
import type { WatchProgress } from '@/domain/types';

let counter = 0;
const opened: AfterfallDB[] = [];
function freshDB() {
  const db = createDB(`test-${Date.now()}-${counter++}`);
  opened.push(db);
  return db;
}
afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete();
});

const SEASON = ['twd-s01e01', 'twd-s01e02', 'twd-s01e03', 'twd-s01e04', 'twd-s01e05', 'twd-s01e06'];

describe('progresso persistente', () => {
  it('estado inicial: nenhum episódio assistido', async () => {
    const db = freshDB();
    expect(await db.progress.count()).toBe(0);
    expect((await getSettings(db)).onboardingDone).toBe(false);
  });

  it('progresso sobrevive a fechar e reabrir o banco (reload)', async () => {
    const db = freshDB();
    await setStatus(db, ['twd-s01e01'], 'completed');
    db.close();
    const reopened = createDB(db.name);
    opened.push(reopened);
    const row = await reopened.progress.get('twd-s01e01');
    expect(row?.status).toBe('completed');
    expect(row?.completedAt).toBeTruthy();
  });

  it('marca uma temporada inteira em lote e registra a sessão', async () => {
    const db = freshDB();
    await setStatus(db, SEASON, 'completed');
    expect(await db.progress.where('status').equals('completed').count()).toBe(6);
    const sessions = await db.sessions.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.episodeIds).toEqual(SEASON);
  });

  it('desfazer restaura exatamente o estado anterior', async () => {
    const db = freshDB();
    await setStatus(db, ['twd-s01e01'], 'completed', new Date('2026-01-01'));
    await toggleFavorite(db, 'twd-s01e02');
    const before = await db.progress.toArray();
    const snap = await setStatus(db, SEASON, 'completed');
    expect(await db.progress.where('status').equals('completed').count()).toBe(6);
    await restoreSnapshot(db, snap);
    expect(await db.progress.toArray()).toEqual(before);
  });

  it('desmarcar mantém favorito e nota, e remove linhas vazias', async () => {
    const db = freshDB();
    await setStatus(db, ['a', 'b'], 'completed');
    await toggleFavorite(db, 'a');
    await setNote(db, 'a', 'Rever com calma');
    await setStatus(db, ['a', 'b'], 'unwatched');
    expect(await db.progress.get('a')).toMatchObject({ status: 'unwatched', favorite: true, note: 'Rever com calma' });
    expect(await db.progress.get('b')).toBeUndefined();
  });

  it('alterar preferências não toca no progresso', async () => {
    const db = freshDB();
    await setStatus(db, SEASON.slice(0, 3), 'completed');
    const before = await db.progress.toArray();
    await updateSettings(db, { orderMode: 'release', includeExtras: false });
    await updateSettings(db, { orderMode: 'chronological', includeExtras: true });
    expect(await db.progress.toArray()).toEqual(before);
    expect((await getSettings(db)).orderMode).toBe('chronological');
  });

  it('alterações de preferências simultâneas não se sobrescrevem', async () => {
    const db = freshDB();
    await Promise.all([
      updateSettings(db, { orderMode: 'release' }),
      updateSettings(db, { includeExtras: false }),
      updateSettings(db, { theme: 'light' }),
    ]);
    expect(await getSettings(db)).toMatchObject({ orderMode: 'release', includeExtras: false, theme: 'light' });
  });

  it('reiniciar a maratona limpa progresso mas mantém preferências', async () => {
    const db = freshDB();
    await updateSettings(db, { theme: 'light', onboardingDone: true });
    await setStatus(db, SEASON, 'completed');
    await resetProgress(db);
    expect(await db.progress.count()).toBe(0);
    expect((await getSettings(db)).theme).toBe('light');
  });
});

describe('migração de schema', () => {
  it('v1 (watched: boolean) migra para v2 (status) sem perder dados', async () => {
    const name = `migrate-${Date.now()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({ progress: 'episodeId, watched', settings: 'id' });
    await legacy.table('progress').bulkPut([
      { episodeId: 'twd-s01e01', watched: true, watchedAt: '2025-05-01T10:00:00.000Z' },
      { episodeId: 'twd-s01e02', watched: false, watchedAt: null },
    ]);
    legacy.close();

    const db = createDB(name);
    opened.push(db);
    await db.open();
    expect(db.verno).toBe(SCHEMA_VERSION);
    expect(await db.progress.get('twd-s01e01')).toEqual({
      episodeId: 'twd-s01e01',
      status: 'completed',
      favorite: false,
      completedAt: '2025-05-01T10:00:00.000Z',
      note: '',
      updatedAt: Date.parse('2025-05-01T10:00:00.000Z'),
    });
    expect((await db.progress.get('twd-s01e02'))?.status).toBe('unwatched');
    expect(await db.sessions.count()).toBe(0);
  });
});

describe('backup', () => {
  it('round-trip: exportar e importar (substituir) reproduz o mesmo progresso', async () => {
    const a = freshDB();
    await setStatus(a, SEASON, 'completed');
    await toggleFavorite(a, 'twd-s01e03');
    await setNote(a, 'twd-s01e04', 'Episódio incrível');
    await updateSettings(a, { orderMode: 'release' });
    const backup = await exportBackup(a, '1.0.0');
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    expect(backup.exportedAt).toBeTruthy();

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const b = freshDB();
    await applyImport(b, parsed.backup, 'replace');
    const sort = (rows: WatchProgress[]) => [...rows].sort((x, y) => x.episodeId.localeCompare(y.episodeId));
    expect(sort(await b.progress.toArray())).toEqual(sort(await a.progress.toArray()));
    expect((await getSettings(b)).orderMode).toBe('release');
  });

  it('rejeita arquivos inválidos sem lançar exceção', () => {
    expect(parseBackup('não é json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ foo: 1 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'afterfall', schemaVersion: 99, exportedAt: 'x', progress: [] })).ok).toBe(false);
    const bad = { app: 'afterfall', schemaVersion: 2, exportedAt: 'x', progress: [{ episodeId: 'a', status: 'talvez' }] };
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
  });

  it('importa backup v1 migrando o formato', () => {
    const v1 = { app: 'afterfall', schemaVersion: 1, exportedAt: '2025-01-01T00:00:00.000Z', progress: [{ episodeId: 'twd-s01e01', watched: true, watchedAt: null }] };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.ok && parsed.migratedFrom).toBe(1);
    expect(parsed.ok && parsed.backup.progress[0]!.status).toBe('completed');
  });

  it('prévia aponta conflitos e IDs desconhecidos antes de qualquer gravação', async () => {
    const db = freshDB();
    await setStatus(db, ['twd-s01e01', 'twd-s01e02'], 'completed');
    const incoming = parseBackup(
      JSON.stringify({
        app: 'afterfall',
        schemaVersion: 2,
        exportedAt: '2026-01-01T00:00:00.000Z',
        progress: [
          { episodeId: 'twd-s01e01', status: 'completed', favorite: false, completedAt: null, note: '', updatedAt: 1 },
          { episodeId: 'twd-s01e02', status: 'in_progress', favorite: false, completedAt: null, note: '', updatedAt: 1 },
          { episodeId: 'zzz-s01e01', status: 'completed', favorite: false, completedAt: null, note: '', updatedAt: 1 },
        ],
      }),
    );
    if (!incoming.ok) throw new Error(incoming.error);
    const before = await db.progress.toArray();
    const preview = await previewImport(db, incoming.backup, new Set(['twd-s01e01', 'twd-s01e02']));
    expect(preview).toMatchObject({ incoming: 3, current: 2, conflicts: 1, unknownIds: ['zzz-s01e01'] });
    expect(await db.progress.toArray()).toEqual(before);
  });

  it('mesclar mantém o registro mais recente e preserva favoritos e notas', () => {
    const base = { completedAt: null, note: '', favorite: false };
    const merged = mergeProgress(
      [
        { ...base, episodeId: 'a', status: 'completed', updatedAt: 10, favorite: true },
        { ...base, episodeId: 'b', status: 'completed', updatedAt: 10, note: 'minha nota' },
      ],
      [
        { ...base, episodeId: 'a', status: 'unwatched', updatedAt: 20 },
        { ...base, episodeId: 'b', status: 'completed', updatedAt: 5 },
        { ...base, episodeId: 'c', status: 'completed', updatedAt: 5 },
      ],
    );
    const byId = new Map(merged.map((p) => [p.episodeId, p]));
    expect(byId.get('a')).toMatchObject({ status: 'unwatched', favorite: true });
    expect(byId.get('b')).toMatchObject({ status: 'completed', note: 'minha nota' });
    expect(byId.get('c')?.status).toBe('completed');
  });

  it('importar o mesmo backup duas vezes (mesclar) não duplica histórico', async () => {
    const a = freshDB();
    await setStatus(a, SEASON, 'completed');
    const backup = await exportBackup(a);
    const b = freshDB();
    await applyImport(b, backup, 'merge');
    await applyImport(b, backup, 'merge');
    const completes = (await b.sessions.toArray()).filter((s) => s.action === 'complete');
    expect(completes).toHaveLength(1);
    expect(await b.progress.count()).toBe(6);
  });
});
