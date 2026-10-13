#!/usr/bin/env node
/**
 * Confere os títulos de src/content/generated/episodes.json (TVmaze) com os títulos das
 * tabelas de episódios da Wikipedia. Lista divergências para revisão editorial — não altera
 * nada. Correções aprovadas vão para src/content/overrides.ts, com fonte.
 *
 * Uso: node scripts/crosscheck-titles.mjs
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'AfterfallDataBot/1.0 (personal non-commercial watch tracker)';
const data = JSON.parse(await readFile(resolve(ROOT, 'src/content/generated/episodes.json'), 'utf8'));

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const PAGES = {
  twd: range(11).map((n) => `The_Walking_Dead_season_${n}`),
  ftwd: range(8).map((n) => `Fear_the_Walking_Dead_season_${n}`),
  wb: ['The_Walking_Dead:_World_Beyond'],
  tales: ['Tales_of_the_Walking_Dead'],
  towl: ['The_Walking_Dead:_The_Ones_Who_Live'],
  dd: ['The_Walking_Dead:_Daryl_Dixon'],
  dc: ['The_Walking_Dead:_Dead_City'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wikitext(page) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return (await res.json()).parse?.wikitext ?? '';
    await sleep(6000 * attempt);
  }
  throw new Error(`Falha ao baixar ${page}`);
}

const clean = (t) =>
  t
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/"/g, '')
    .trim();
const norm = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

let mismatches = 0;
for (const s of data.series) {
  const titles = [];
  for (const page of PAGES[s.id]) {
    const w = await wikitext(page);
    for (const m of w.matchAll(/\{\{\s*Episode list[\s\S]*?\|\s*Title\s*=\s*([^\n]*)/g)) titles.push(clean(m[1]));
    await sleep(2000);
  }
  const eps = s.seasons.flatMap((x) => x.episodes);
  if (titles.length !== eps.length) console.log(`! ${s.id}: Wikipedia lista ${titles.length} títulos, catálogo tem ${eps.length}`);
  eps.forEach((e, i) => {
    const w = titles[i];
    if (w !== undefined && norm(w) !== norm(e.titleOriginal)) {
      mismatches++;
      console.log(`${e.id}\tTVmaze: ${e.titleOriginal}\tWikipedia: ${w}`);
    }
  });
}
console.log(`\n${mismatches} divergência(s) de título.`);
