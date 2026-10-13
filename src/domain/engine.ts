/**
 * Motor de cronologia do AFTERFALL.
 *
 * Funções puras: recebem catálogo + progresso + preferências e devolvem ordem, fila e
 * indicadores. O progresso é indexado apenas por ID de episódio, por isso mudar o modo
 * de ordenação ou a inclusão de extras nunca altera dados do usuário.
 */
import type {
  Catalog,
  Episode,
  EpisodeId,
  OrderMode,
  TimelineEntry,
  TimelinePhase,
  WatchProgress,
} from './types';

export type ProgressMap = ReadonlyMap<EpisodeId, WatchProgress>;

export interface OrderOptions {
  mode: OrderMode;
  includeExtras: boolean;
}

export interface CatalogIndex {
  catalog: Catalog;
  episodes: Map<EpisodeId, Episode>;
  /** Episódio -> bloco da timeline em que aparece. */
  entryOf: Map<EpisodeId, TimelineEntry>;
  phases: Map<string, TimelinePhase>;
  seriesOrder: Map<string, number>;
  /** Ordem cronológica completa (com extras). */
  chronological: EpisodeId[];
  /** Ordem de lançamento completa (com extras). */
  release: EpisodeId[];
}

export function episodeIdsOfEntry(catalog: Pick<Catalog, 'seasons'>, entry: TimelineEntry): EpisodeId[] {
  const season = catalog.seasons.find((s) => s.seriesId === entry.seriesId && s.number === entry.season);
  if (!season) return [];
  return season.episodeIds.slice(entry.from - 1, entry.to);
}

export function compareRelease(a: Episode, b: Episode, seriesOrder: ReadonlyMap<string, number>): number {
  const da = a.airdate ?? '9999-99-99';
  const db = b.airdate ?? '9999-99-99';
  if (da !== db) return da < db ? -1 : 1;
  const sa = seriesOrder.get(a.seriesId) ?? 99;
  const sb = seriesOrder.get(b.seriesId) ?? 99;
  if (sa !== sb) return sa - sb;
  if (a.season !== b.season) return a.season - b.season;
  return a.number - b.number;
}

export function buildIndex(catalog: Catalog): CatalogIndex {
  const episodes = new Map(catalog.episodes.map((e) => [e.id, e]));
  const phases = new Map(catalog.phases.map((p) => [p.id, p]));
  const seriesOrder = new Map(catalog.series.map((s, i) => [s.id, i]));
  const entryOf = new Map<EpisodeId, TimelineEntry>();
  const chronological: EpisodeId[] = [];

  const phaseRank = new Map(catalog.phases.map((p, i) => [p.id, i]));
  // Ordenação estável: fase primeiro, depois a ordem em que o bloco aparece no arquivo.
  const entries = catalog.entries
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => (phaseRank.get(a.entry.phaseId)! - phaseRank.get(b.entry.phaseId)!) || a.i - b.i)
    .map((x) => x.entry);

  for (const entry of entries) {
    for (const id of episodeIdsOfEntry(catalog, entry)) {
      if (entryOf.has(id)) continue; // um episódio nunca é duplicado
      entryOf.set(id, entry);
      chronological.push(id);
    }
  }

  const release = [...catalog.episodes]
    .sort((a, b) => compareRelease(a, b, seriesOrder))
    .map((e) => e.id);

  return { catalog, episodes, entryOf, phases, seriesOrder, chronological, release };
}

/** Ordem da jornada segundo as preferências. Determinística. */
export function getOrder(index: CatalogIndex, opts: OrderOptions): EpisodeId[] {
  const base = opts.mode === 'chronological' ? index.chronological : index.release;
  if (opts.includeExtras) return base;
  return base.filter((id) => index.episodes.get(id)?.kind === 'main');
}

export const isCompleted = (progress: ProgressMap, id: EpisodeId) => progress.get(id)?.status === 'completed';

/**
 * Próximo episódio da jornada.
 *
 * 1. Âncora = último episódio tocado (concluído ou em andamento), pelo horário da alteração
 *    e, em empate (marcação em lote), pela posição mais adiantada na ordem.
 * 2. Se a âncora está em andamento, ela é o próximo.
 * 3. Senão, o primeiro não concluído depois da âncora.
 * 4. Se não houver, o primeiro não concluído desde o início (episódios pulados).
 * 5. Tudo concluído -> null.
 */
export function getNextUp(order: readonly EpisodeId[], progress: ProgressMap): EpisodeId | null {
  const anchor = findAnchor(order, progress);
  if (anchor >= 0 && progress.get(order[anchor]!)?.status === 'in_progress') return order[anchor]!;
  for (let i = anchor + 1; i < order.length; i++) if (!isCompleted(progress, order[i]!)) return order[i]!;
  for (let i = 0; i < order.length; i++) if (!isCompleted(progress, order[i]!)) return order[i]!;
  return null;
}

/**
 * Posição da âncora ("onde parei"). Itens alterados no mesmo instante formam um lote.
 * Um lote só vale como âncora se for contíguo na ordem atual: marcar uma série inteira que
 * aparece intercalada com outras (ex.: "já vi toda a série-mãe") não deve empurrar o cursor
 * para o fim dela, pulando tudo o que vem entre seus episódios. Nesse caso usa-se o lote
 * anterior; sem lote válido, a jornada recomeça do primeiro pendente.
 */
function findAnchor(order: readonly EpisodeId[], progress: ProgressMap): number {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < order.length; i++) {
    const p = progress.get(order[i]!);
    if (!p || p.status === 'unwatched') continue;
    const list = groups.get(p.updatedAt);
    if (list) list.push(i);
    else groups.set(p.updatedAt, [i]);
  }
  const times = [...groups.keys()].sort((a, b) => b - a);
  for (const t of times) {
    const positions = groups.get(t)!;
    const first = positions[0]!;
    const last = positions.at(-1)!;
    let contiguous = true;
    for (let i = first + 1; i < last; i++) {
      const p = progress.get(order[i]!);
      if (p?.status !== 'completed' && p?.updatedAt !== t) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) return last;
  }
  return -1;
}

/** Fila: próximos N episódios não concluídos a partir do próximo da jornada. */
export function getQueue(order: readonly EpisodeId[], progress: ProgressMap, size = 10): EpisodeId[] {
  const next = getNextUp(order, progress);
  if (!next) return [];
  const start = order.indexOf(next);
  const queue: EpisodeId[] = [];
  for (let i = start; i < order.length && queue.length < size; i++) {
    if (!isCompleted(progress, order[i]!)) queue.push(order[i]!);
  }
  return queue;
}

/** Último concluído (pelo horário da conclusão). */
export function getLastWatched(order: readonly EpisodeId[], progress: ProgressMap): EpisodeId | null {
  let best: EpisodeId | null = null;
  let bestTime = -Infinity;
  const inOrder = new Set(order);
  for (const p of progress.values()) {
    if (p.status !== 'completed' || !inOrder.has(p.episodeId)) continue;
    if (p.updatedAt > bestTime) {
      best = p.episodeId;
      bestTime = p.updatedAt;
    }
  }
  return best;
}

export function getNeighbors(order: readonly EpisodeId[], id: EpisodeId) {
  const i = order.indexOf(id);
  if (i < 0) return { prev: null, next: null, position: null };
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null, position: i + 1 };
}

export interface ProgressSummary {
  total: number;
  completed: number;
  remaining: number;
  /** 0..1 */
  ratio: number;
}

export function summarize(ids: readonly EpisodeId[], progress: ProgressMap): ProgressSummary {
  let completed = 0;
  for (const id of ids) if (isCompleted(progress, id)) completed++;
  const total = ids.length;
  return { total, completed, remaining: total - completed, ratio: total ? completed / total : 0 };
}

/**
 * Transição de produção: quando o próximo episódio pertence a uma série diferente da do
 * episódio anterior na ordem, devolve a mudança para que a UI possa explicá-la.
 */
export function getTransition(index: CatalogIndex, order: readonly EpisodeId[], id: EpisodeId) {
  const i = order.indexOf(id);
  if (i <= 0) return null;
  const prev = index.episodes.get(order[i - 1]!);
  const cur = index.episodes.get(id);
  if (!prev || !cur || prev.seriesId === cur.seriesId) return null;
  return { fromSeriesId: prev.seriesId, toSeriesId: cur.seriesId, entry: index.entryOf.get(id) ?? null };
}

/** Próximo marco: o início da próxima fase cronológica a partir de um episódio. */
export function getNextMilestone(index: CatalogIndex, order: readonly EpisodeId[], fromId: EpisodeId | null) {
  if (!fromId) return null;
  const start = order.indexOf(fromId);
  if (start < 0) return null;
  const currentPhase = index.entryOf.get(fromId)?.phaseId;
  for (let i = start + 1; i < order.length; i++) {
    const entry = index.entryOf.get(order[i]!);
    if (entry && entry.phaseId !== currentPhase) {
      return { phase: index.phases.get(entry.phaseId)!, episodeId: order[i]!, distance: i - start };
    }
  }
  return null;
}

/** Quantos episódios não concluídos ficaram para trás da posição atual. */
export function countSkipped(order: readonly EpisodeId[], progress: ProgressMap, nextId: EpisodeId | null): number {
  if (!nextId) return 0;
  const end = order.indexOf(nextId);
  let n = 0;
  for (let i = 0; i < end; i++) if (!isCompleted(progress, order[i]!)) n++;
  return n;
}

/** Tempo (minutos) somando apenas durações conhecidas; informa quantos ficaram sem dado. */
export function sumRuntime(index: CatalogIndex, ids: readonly EpisodeId[], pick: 'runtimeMinutes' | 'slotRuntime') {
  let minutes = 0;
  let unknown = 0;
  for (const id of ids) {
    const value = index.episodes.get(id)?.[pick] ?? null;
    if (value == null) unknown++;
    else minutes += value;
  }
  return { minutes, unknown };
}

/**
 * Spoiler shield: o título só aparece para episódios concluídos, em andamento, o próximo da
 * jornada ou revelados explicitamente. Aplica-se ao conteúdo (o texto nem é entregue à UI).
 */
export function canShowTitle(
  id: EpisodeId,
  opts: { shield: boolean; progress: ProgressMap; nextUp: EpisodeId | null; revealed: ReadonlySet<EpisodeId> },
): boolean {
  if (!opts.shield) return true;
  if (id === opts.nextUp || opts.revealed.has(id)) return true;
  const status = opts.progress.get(id)?.status;
  return status === 'completed' || status === 'in_progress';
}
