import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { db } from '@/data/db';
import { getSettings, restoreSnapshot, setStatus, toggleFavorite, updateSettings, type Snapshot } from '@/data/progressRepo';
import { catalog } from '@/content/catalog';
import {
  buildIndex,
  canShowTitle,
  countSkipped,
  getLastWatched,
  getNextMilestone,
  getNextUp,
  getOrder,
  getQueue,
  summarize,
  type ProgressMap,
} from '@/domain/engine';
import type { Episode, EpisodeId, Series, UserSettings, WatchProgress, WatchStatus } from '@/domain/types';
import { useUI } from './ui';

export const INDEX = buildIndex(catalog);
export const SERIES = new Map(catalog.series.map((s) => [s.id, s]));
export const ALL_IDS = new Set(catalog.episodes.map((e) => e.id));

export const getEpisode = (id: EpisodeId): Episode | undefined => INDEX.episodes.get(id);
export const getSeries = (id: string): Series | undefined => SERIES.get(id);

export function useSettings(): UserSettings | undefined {
  return useLiveQuery(() => getSettings(db), []);
}

export function useProgressMap(): ProgressMap | undefined {
  const rows = useLiveQuery(() => db.progress.toArray(), []);
  return useMemo(() => (rows ? new Map(rows.map((r) => [r.episodeId, r])) : undefined), [rows]);
}

export interface Journey {
  settings: UserSettings;
  progress: ProgressMap;
  order: EpisodeId[];
  position: Map<EpisodeId, number>;
  nextUp: EpisodeId | null;
  queue: EpisodeId[];
  lastWatched: EpisodeId | null;
  summary: ReturnType<typeof summarize>;
  milestone: ReturnType<typeof getNextMilestone>;
  skipped: number;
}

export function useJourney(): Journey | undefined {
  const settings = useSettings();
  const progress = useProgressMap();
  return useMemo(() => {
    if (!settings || !progress) return undefined;
    const order = getOrder(INDEX, { mode: settings.orderMode, includeExtras: settings.includeExtras });
    const nextUp = getNextUp(order, progress);
    return {
      settings,
      progress,
      order,
      position: new Map(order.map((id, i) => [id, i + 1])),
      nextUp,
      queue: getQueue(order, progress, 8),
      lastWatched: getLastWatched(order, progress),
      summary: summarize(order, progress),
      milestone: getNextMilestone(INDEX, order, nextUp),
      skipped: countSkipped(order, progress, nextUp),
    };
  }, [settings, progress]);
}

/** Título respeitando a proteção contra spoilers. `title` é null quando oculto. */
export function useTitleGate(journey: Journey | undefined) {
  const revealed = useUI((s) => s.revealed);
  return useCallback(
    (ep: Episode): string | null => {
      const title = ep.titlePt ?? ep.titleOriginal ?? '';
      if (!journey) return null;
      if (title === '') return title; // sem título: nada a esconder
      const ok = canShowTitle(ep.id, {
        shield: journey.settings.spoilerShield,
        progress: journey.progress,
        nextUp: journey.nextUp,
        revealed,
      });
      return ok ? title : null;
    },
    [journey, revealed],
  );
}

export const statusOf = (progress: ProgressMap | undefined, id: EpisodeId): WatchStatus =>
  progress?.get(id)?.status ?? 'unwatched';

function undoable(message: string, snapshot: Snapshot, description?: string) {
  toast.success(message, {
    description,
    action: {
      label: 'Desfazer',
      onClick: () => {
        void restoreSnapshot(db, snapshot).then(() => toast('Alteração desfeita'));
      },
    },
  });
}

function fail(err: unknown) {
  console.error(err);
  toast.error('Não foi possível salvar', { description: 'Seu navegador recusou a gravação local. Tente novamente.' });
}

export const actions = {
  async complete(ids: EpisodeId[], message?: string) {
    try {
      const snap = await setStatus(db, ids, 'completed');
      const changed = snap.rows.filter((r) => r.before?.status !== 'completed').length;
      if (changed === 0) return;
      undoable(message ?? (ids.length === 1 ? 'Episódio concluído' : `${changed} episódios concluídos`), snap);
    } catch (e) {
      fail(e);
    }
  },
  async uncomplete(ids: EpisodeId[], message?: string) {
    try {
      const snap = await setStatus(db, ids, 'unwatched');
      undoable(message ?? (ids.length === 1 ? 'Marcado como não assistido' : `${ids.length} episódios desmarcados`), snap);
    } catch (e) {
      fail(e);
    }
  },
  async start(id: EpisodeId) {
    try {
      const snap = await setStatus(db, [id], 'in_progress');
      undoable('Marcado como em andamento', snap);
    } catch (e) {
      fail(e);
    }
  },
  async toggle(id: EpisodeId, current: WatchStatus) {
    return current === 'completed' ? actions.uncomplete([id]) : actions.complete([id]);
  },
  async favorite(id: EpisodeId, current: WatchProgress | undefined) {
    try {
      const snap = await toggleFavorite(db, id);
      toast(current?.favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', {
        action: { label: 'Desfazer', onClick: () => void restoreSnapshot(db, snap) },
      });
    } catch (e) {
      fail(e);
    }
  },
  async settings(patch: Partial<Omit<UserSettings, 'id'>>) {
    try {
      return await updateSettings(db, patch);
    } catch (e) {
      fail(e);
    }
  },
};
