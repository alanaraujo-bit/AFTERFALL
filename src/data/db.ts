/**
 * Persistência local (IndexedDB via Dexie).
 *
 * Histórico do schema:
 *  v1 — progress { episodeId, watched: boolean, watchedAt } + settings
 *  v2 — progress passa a usar status/favorite/note/updatedAt; nova tabela sessions.
 *
 * Toda mudança de schema deve adicionar uma nova versão com `upgrade`, nunca editar uma
 * versão existente — assim os dados de quem já usa o app são migrados, não perdidos.
 */
import Dexie, { type EntityTable, type Transaction } from 'dexie';
import type { UserSettings, WatchProgress, WatchSession } from '@/domain/types';

export const DB_NAME = 'afterfall';
export const SCHEMA_VERSION = 2;

/** Formato legado (v1), mantido para migração e importação de backups antigos. */
export interface LegacyProgressV1 {
  episodeId: string;
  watched: boolean;
  watchedAt: string | null;
}

export function migrateProgressV1(row: LegacyProgressV1): WatchProgress {
  const at = row.watchedAt && !Number.isNaN(Date.parse(row.watchedAt)) ? row.watchedAt : null;
  return {
    episodeId: row.episodeId,
    status: row.watched ? 'completed' : 'unwatched',
    favorite: false,
    completedAt: row.watched ? at : null,
    note: '',
    updatedAt: at ? Date.parse(at) : 0,
  };
}

export type AfterfallDB = Dexie & {
  progress: EntityTable<WatchProgress, 'episodeId'>;
  sessions: EntityTable<WatchSession, 'id'>;
  settings: EntityTable<UserSettings, 'id'>;
};

export function defineSchema(db: Dexie) {
  db.version(1).stores({
    progress: 'episodeId, watched',
    settings: 'id',
  });
  db.version(2)
    .stores({
      progress: 'episodeId, status, favorite, updatedAt',
      sessions: '++id, at, action',
      settings: 'id',
    })
    .upgrade(async (tx: Transaction) => {
      await tx
        .table('progress')
        .toCollection()
        .modify((row: Record<string, unknown>) => {
          if ('status' in row) return;
          const next = migrateProgressV1(row as unknown as LegacyProgressV1);
          for (const key of Object.keys(row)) delete row[key];
          Object.assign(row, next);
        });
    });
}

export function createDB(name = DB_NAME): AfterfallDB {
  const db = new Dexie(name) as AfterfallDB;
  defineSchema(db);
  return db;
}

export const db = createDB();
