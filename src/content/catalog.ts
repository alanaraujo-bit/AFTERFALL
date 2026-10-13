/**
 * Monta o catálogo a partir das fontes versionadas:
 *  - generated/episodes.json  (scripts/fetch-episodes.mjs — TVmaze + Wikipedia)
 *  - extras.json              (webisódios oficiais, pesquisa editorial)
 *  - series.ts / timeline.ts / sources.ts (texto e ordem editoriais)
 */
import generated from './generated/episodes.json';
import extrasData from './extras.json';
import { MAIN_SERIES } from './series';
import { ENTRIES, PHASES, TIMELINE_VERSION } from './timeline';
import { SOURCES } from './sources';
import { TITLE_OVERRIDES } from './overrides';
import type { Catalog, EditorialSource, Episode, Season, Series, TimelineEntry } from '@/domain/types';

const pad = (n: number) => String(n).padStart(2, '0');

const EXTRA_META: Record<string, { code: string; safe: string }> = {
  'torn-apart': {
    code: 'TA',
    safe: 'Seis partes curtas sobre uma família nos primeiros dias do surto, na Geórgia. Conta a origem de uma figura vista no primeiro episódio da série-mãe.',
  },
  'cold-storage': {
    code: 'CS',
    safe: 'Um jovem procura abrigo em um depósito nos arredores de Atlanta logo no início do surto.',
  },
  'the-oath': {
    code: 'OATH',
    safe: 'Dois sobreviventes buscam ajuda em um hospital nos primeiros dias. Revela a origem de um cenário marcante do primeiro episódio da série-mãe.',
  },
  'flight-462': {
    code: 'F462',
    safe: 'Passageiros de um voo comercial percebem que algo está muito errado enquanto o surto começa em terra.',
  },
  passage: {
    code: 'PSG',
    safe: 'Duas sobreviventes atravessam a região da fronteira entre os Estados Unidos e o México.',
  },
  'red-machete': {
    code: 'RM',
    safe: 'A trajetória de um objeto que passa de mão em mão ao longo de anos de apocalipse.',
  },
  'althea-tapes': {
    code: 'ALT',
    safe: 'Entrevistas gravadas por uma jornalista que registra as histórias de quem sobreviveu.',
  },
  'dead-in-the-water': {
    code: 'DITW',
    safe: 'A bordo de um submarino da Marinha dos EUA, a tripulação enfrenta o início do fim isolada no fundo do mar.',
  },
};

function desaturate(hex: string, amount = 0.45): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const gray = 0.3 * r + 0.59 * g + 0.11 * b;
  const mix = (c: number) => Math.round(c + (gray - c) * amount);
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

export function createCatalog(): Catalog {
  const series: Series[] = [...MAIN_SERIES];
  const seasons: Season[] = [];
  const episodes: Episode[] = [];
  const sources: EditorialSource[] = [...SOURCES];

  for (const gs of generated.series) {
    for (const s of gs.seasons) {
      seasons.push({
        seriesId: gs.id,
        number: s.number,
        label: gs.id === 'tales' || gs.id === 'towl' ? 'Temporada única' : `Temporada ${s.number}`,
        episodeIds: s.episodes.map((e) => e.id),
      });
      for (const e of s.episodes) {
        const override = TITLE_OVERRIDES[e.id];
        episodes.push({
          id: e.id,
          seriesId: gs.id,
          season: e.season,
          number: e.number,
          titleOriginal: override?.title ?? e.titleOriginal,
          titlePt: null,
          airdate: e.airdate,
          runtimeMinutes: null,
          slotRuntime: e.slotRuntime,
          kind: 'main',
          tvmazeId: e.tvmazeId,
          synopsis: null,
          sourceIds: [`tvmaze-${gs.id}`, `wiki-${gs.id}`, ...(override ? [override.sourceId] : [])],
        });
      }
    }
  }

  for (const x of extrasData.series) {
    const parent = MAIN_SERIES.find((m) => m.id === x.parentId);
    const meta = EXTRA_META[x.id];
    if (!parent || !meta) throw new Error(`Extra sem metadados: ${x.id}`);
    const sourceIds = x.sources.map((url, i) => {
      const id = `src-${x.id}-${i + 1}`;
      const host = new URL(url).hostname.replace(/^(en\.|www\.)/, '');
      sources.push({ id, label: `${host} — ${x.title}`, url, verifiedAt: extrasData.verifiedAt });
      return id;
    });
    series.push({
      id: x.id,
      title: x.title,
      shortTitle: x.title.replace(/^(The Walking Dead|Fear the Walking Dead): /, ''),
      code: meta.code,
      kind: 'extra',
      parentId: parent.id,
      years: x.years,
      network: 'Web',
      accent: desaturate(parent.accent),
      description: { safe: meta.safe },
      formatNote: `Webisódio em ${x.parts.length} partes · ${x.releasePlatform}`,
      sourceIds,
    });
    seasons.push({
      seriesId: x.id,
      number: 1,
      label: `${x.parts.length} partes`,
      episodeIds: x.parts.map((p) => `${x.id}-p${pad(p.part)}`),
    });
    for (const p of x.parts) {
      episodes.push({
        id: `${x.id}-p${pad(p.part)}`,
        seriesId: x.id,
        season: 1,
        number: p.part,
        // "Part 1", "Part 2"… não são títulos: o webisódio não tem título por parte.
        titleOriginal: /^Part \d+$/.test(p.title) ? null : p.title,
        titlePt: null,
        airdate: p.releaseDate,
        runtimeMinutes: p.runtimeMinutes,
        slotRuntime: null,
        kind: 'extra',
        tvmazeId: null,
        synopsis: null,
        sourceIds,
      });
    }
  }

  const entries: TimelineEntry[] = ENTRIES.map((spec, i) => {
    const season = seasons.find((s) => s.seriesId === spec.seriesId && s.number === spec.season);
    const size = season?.episodeIds.length ?? 0;
    const to = spec.to === undefined || spec.to === 'all' ? size : spec.to;
    return {
      id: `${spec.phaseId}-${i + 1}`,
      phaseId: spec.phaseId,
      seriesId: spec.seriesId,
      season: spec.season,
      from: spec.from ?? 1,
      to,
      confidence: spec.confidence,
      note: spec.note,
      sourceIds: spec.sourceIds,
    };
  });

  return {
    version: `${TIMELINE_VERSION}+${generated.cutoff}`,
    verifiedAt: generated.cutoff,
    series,
    seasons,
    episodes,
    phases: PHASES,
    entries,
    sources,
  };
}

export const catalog = createCatalog();
