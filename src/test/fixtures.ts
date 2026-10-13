import type { Catalog, Episode, WatchProgress } from '@/domain/types';

const ep = (seriesId: string, season: number, number: number, airdate: string, kind: 'main' | 'extra' = 'main'): Episode => ({
  id: `${seriesId}-s${String(season).padStart(2, '0')}e${String(number).padStart(2, '0')}`,
  seriesId,
  season,
  number,
  titleOriginal: `${seriesId} ${season}x${number}`,
  titlePt: null,
  airdate,
  runtimeMinutes: number === 1 ? 45 : null,
  slotRuntime: 60,
  kind,
  tvmazeId: null,
  synopsis: null,
  sourceIds: [],
});

/** Catálogo mínimo: série A (2 temporadas), série B (lançada depois mas passada antes) e um extra. */
export function makeCatalog(): Catalog {
  const episodes = [
    ep('a', 1, 1, '2010-01-01'),
    ep('a', 1, 2, '2010-01-08'),
    ep('a', 2, 1, '2011-01-01'),
    ep('a', 2, 2, '2011-01-08'),
    ep('b', 1, 1, '2015-01-01'),
    ep('b', 1, 2, '2015-01-08'),
    ep('x', 1, 1, '2012-06-01', 'extra'),
  ];
  const seasons = [
    { seriesId: 'a', number: 1, label: 'T1', episodeIds: ['a-s01e01', 'a-s01e02'] },
    { seriesId: 'a', number: 2, label: 'T2', episodeIds: ['a-s02e01', 'a-s02e02'] },
    { seriesId: 'b', number: 1, label: 'T1', episodeIds: ['b-s01e01', 'b-s01e02'] },
    { seriesId: 'x', number: 1, label: 'Partes', episodeIds: ['x-s01e01'] },
  ];
  return {
    version: 'test',
    verifiedAt: '2026-10-13',
    series: ['a', 'b', 'x'].map((id) => ({
      id,
      title: id,
      shortTitle: id,
      code: id.toUpperCase(),
      kind: id === 'x' ? ('extra' as const) : ('main' as const),
      years: '',
      network: '',
      description: { safe: '' },
      accent: '#000000',
      sourceIds: [],
    })),
    seasons,
    episodes,
    phases: [
      { id: 'p1', title: 'Queda', era: 'Ano 0', summary: '', confidence: 'high' },
      { id: 'p2', title: 'Depois', era: 'Ano 1', summary: '', confidence: 'medium' },
    ],
    // B se passa antes de A T2; o extra fica entre os episódios de B.
    entries: [
      { id: 'e1', phaseId: 'p1', seriesId: 'a', season: 1, from: 1, to: 2, confidence: 'high', sourceIds: [] },
      { id: 'e2', phaseId: 'p1', seriesId: 'b', season: 1, from: 1, to: 1, confidence: 'high', sourceIds: [] },
      { id: 'e3', phaseId: 'p1', seriesId: 'x', season: 1, from: 1, to: 1, confidence: 'approximate', sourceIds: [] },
      { id: 'e4', phaseId: 'p1', seriesId: 'b', season: 1, from: 2, to: 2, confidence: 'high', sourceIds: [] },
      { id: 'e5', phaseId: 'p2', seriesId: 'a', season: 2, from: 1, to: 2, confidence: 'medium', sourceIds: [] },
    ],
    sources: [],
  };
}

export function progress(rows: Array<[string, WatchProgress['status'], number]>): Map<string, WatchProgress> {
  return new Map(
    rows.map(([episodeId, status, updatedAt]) => [
      episodeId,
      {
        episodeId,
        status,
        favorite: false,
        completedAt: status === 'completed' ? new Date(updatedAt).toISOString() : null,
        note: '',
        updatedAt,
      },
    ]),
  );
}
