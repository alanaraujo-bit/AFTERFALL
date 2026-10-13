#!/usr/bin/env node
/**
 * Atualiza os metadados verificáveis dos episódios a partir de fontes públicas.
 *
 * Fonte primária: TVmaze API (https://www.tvmaze.com/api — dados CC BY-SA 4.0).
 * Verificação cruzada: contagem de episódios por temporada na Wikipedia (EN).
 *
 * Somente episódios com data de exibição <= data de corte são incluídos.
 * Nada é inventado: campos ausentes na fonte ficam null.
 *
 * Uso:  node scripts/fetch-episodes.mjs [--cutoff=YYYY-MM-DD]
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/content/generated/episodes.json');
const UA = 'AfterfallDataBot/1.0 (personal non-commercial watch tracker)';

const cutoffArg = process.argv.find((a) => a.startsWith('--cutoff='));
const CUTOFF = cutoffArg ? cutoffArg.split('=')[1] : new Date().toISOString().slice(0, 10);

/** Séries principais. `wiki` = página que contém o template {{Series overview}}. */
const SHOWS = [
  { id: 'twd', tvmaze: 73, wiki: 'List_of_The_Walking_Dead_episodes' },
  { id: 'ftwd', tvmaze: 1824, wiki: 'List_of_Fear_the_Walking_Dead_episodes' },
  { id: 'wb', tvmaze: 45194, wiki: 'The_Walking_Dead:_World_Beyond' },
  { id: 'tales', tvmaze: 50287, wiki: 'Tales_of_the_Walking_Dead' },
  { id: 'towl', tvmaze: 64504, wiki: 'The_Walking_Dead:_The_Ones_Who_Live' },
  { id: 'dd', tvmaze: 64501, wiki: 'The_Walking_Dead:_Daryl_Dixon' },
  { id: 'dc', tvmaze: 60879, wiki: 'The_Walking_Dead:_Dead_City' },
];

async function getJson(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
  throw new Error(`Falha após novas tentativas: ${url}`);
}

async function wikiSeasonCounts(page) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const json = await getJson(url);
  const text = json?.parse?.wikitext ?? '';
  const start = text.indexOf('{{Series overview');
  if (start < 0) {
    // Séries de temporada única: usa num_episodes do infobox.
    const seasonsM = text.match(/\|\s*num_seasons\s*=\s*(\d+)/);
    const epsM = text.match(/\|\s*num_episodes\s*=\s*(\d+)/);
    return (!seasonsM || seasonsM[1] === '1') && epsM ? { 1: Number(epsM[1]) } : null;
  }
  const block = text.slice(start, text.indexOf('\n}}', start));
  const counts = {};
  for (const m of block.matchAll(/\|\s*episodes(\d+)\s*=\s*(\d+)/g)) counts[Number(m[1])] = Number(m[2]);
  return counts;
}

const pad = (n) => String(n).padStart(2, '0');

async function main() {
  const series = [];
  const warnings = [];

  for (const show of SHOWS) {
    const meta = await getJson(`https://api.tvmaze.com/shows/${show.tvmaze}`);
    const all = await getJson(`https://api.tvmaze.com/shows/${show.tvmaze}/episodes`);
    const aired = all.filter((e) => e.type === 'regular' && e.airdate && e.airdate <= CUTOFF && e.number != null);
    const upcoming = all.filter((e) => e.type === 'regular' && (!e.airdate || e.airdate > CUTOFF)).length;

    const seasons = new Map();
    for (const e of aired) {
      if (!seasons.has(e.season)) seasons.set(e.season, []);
      seasons.get(e.season).push({
        id: `${show.id}-s${pad(e.season)}e${pad(e.number)}`,
        season: e.season,
        number: e.number,
        titleOriginal: e.name,
        airdate: e.airdate,
        slotRuntime: typeof e.runtime === 'number' ? e.runtime : null,
        tvmazeId: e.id,
      });
    }

    const wiki = await wikiSeasonCounts(show.wiki).catch((err) => {
      warnings.push(`${show.id}: Wikipedia indisponível (${err.message})`);
      return null;
    });
    const crossCheck = {};
    for (const [s, eps] of seasons) {
      const w = wiki?.[s] ?? null;
      crossCheck[s] = { tvmaze: eps.length, wikipedia: w, match: w === null ? null : w === eps.length };
      if (w !== null && w !== eps.length) {
        warnings.push(`${show.id} T${s}: TVmaze=${eps.length} x Wikipedia=${w} (verificar se a temporada ainda está em exibição)`);
      }
    }

    series.push({
      id: show.id,
      tvmazeId: show.tvmaze,
      tvmazeName: meta.name,
      status: meta.status,
      upcomingEpisodesListed: upcoming,
      sources: [meta.url, `https://en.wikipedia.org/wiki/${show.wiki}`],
      crossCheck,
      seasons: [...seasons.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([number, episodes]) => ({ number, episodes: episodes.sort((a, b) => a.number - b.number) })),
    });
    console.log(`✓ ${show.id}: ${aired.length} episódios exibidos até ${CUTOFF}`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    cutoff: CUTOFF,
    license: 'Metadados de episódios: TVmaze (CC BY-SA 4.0). Contagens conferidas com a Wikipedia (CC BY-SA 4.0).',
    note: 'slotRuntime é a duração da faixa de exibição informada pelo TVmaze (inclui intervalos comerciais); não é a duração exata do episódio.',
    warnings,
    series,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  if (warnings.length) console.warn('\nAvisos:\n- ' + warnings.join('\n- '));
  console.log(`\nGravado em ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
