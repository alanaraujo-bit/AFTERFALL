import type { Catalog } from './types';
import { buildIndex, episodeIdsOfEntry } from './engine';

/** Verifica a integridade do catálogo. Devolve a lista de problemas (vazia = ok). */
export function validateCatalog(catalog: Catalog, today = new Date().toISOString().slice(0, 10)): string[] {
  const errors: string[] = [];
  const seriesIds = new Set(catalog.series.map((s) => s.id));
  const sourceIds = new Set(catalog.sources.map((s) => s.id));
  const phaseIds = new Set(catalog.phases.map((p) => p.id));

  const ids = new Set<string>();
  for (const e of catalog.episodes) {
    if (ids.has(e.id)) errors.push(`ID de episódio duplicado: ${e.id}`);
    ids.add(e.id);
    if (!seriesIds.has(e.seriesId)) errors.push(`${e.id}: série desconhecida ${e.seriesId}`);
    if (e.airdate !== null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.airdate) || Number.isNaN(Date.parse(e.airdate))) errors.push(`${e.id}: data inválida ${e.airdate}`);
      else if (e.airdate > today) errors.push(`${e.id}: episódio ainda não exibido (${e.airdate})`);
    }
    if (e.runtimeMinutes !== null && !(e.runtimeMinutes > 0 && e.runtimeMinutes < 200)) errors.push(`${e.id}: duração implausível`);
    for (const s of e.sourceIds) if (!sourceIds.has(s)) errors.push(`${e.id}: fonte inexistente ${s}`);
  }

  for (const season of catalog.seasons) {
    for (const id of season.episodeIds) if (!ids.has(id)) errors.push(`Temporada ${season.seriesId} T${season.number}: episódio ausente ${id}`);
  }

  for (const s of catalog.series) {
    if (!/^#[0-9a-f]{6}$/i.test(s.accent)) errors.push(`${s.id}: cor inválida`);
    if (s.sourceIds.length === 0) errors.push(`${s.id}: série sem fonte`);
    for (const src of s.sourceIds) if (!sourceIds.has(src)) errors.push(`${s.id}: fonte inexistente ${src}`);
    if (s.parentId && !seriesIds.has(s.parentId)) errors.push(`${s.id}: série-mãe inexistente`);
  }

  // Timeline: cada episódio aparece exatamente uma vez.
  const seen = new Map<string, string>();
  for (const entry of catalog.entries) {
    if (!phaseIds.has(entry.phaseId)) errors.push(`${entry.id}: fase inexistente ${entry.phaseId}`);
    const season = catalog.seasons.find((s) => s.seriesId === entry.seriesId && s.number === entry.season);
    if (!season) {
      errors.push(`${entry.id}: temporada inexistente ${entry.seriesId} T${entry.season}`);
      continue;
    }
    if (entry.from < 1 || entry.to > season.episodeIds.length || entry.from > entry.to) {
      errors.push(`${entry.id}: intervalo ${entry.from}–${entry.to} fora da temporada (${season.episodeIds.length} ep.)`);
    }
    if (entry.sourceIds.length === 0) errors.push(`${entry.id}: bloco sem fonte`);
    for (const s of entry.sourceIds) if (!sourceIds.has(s)) errors.push(`${entry.id}: fonte inexistente ${s}`);
    for (const id of episodeIdsOfEntry(catalog, entry)) {
      if (seen.has(id)) errors.push(`${id} aparece em dois blocos (${seen.get(id)} e ${entry.id})`);
      seen.set(id, entry.id);
    }
  }
  for (const id of ids) if (!seen.has(id)) errors.push(`${id} não está posicionado na timeline`);

  const index = buildIndex(catalog);
  if (index.chronological.length !== catalog.episodes.length) errors.push('Ordem cronológica incompleta');
  if (index.release.length !== catalog.episodes.length) errors.push('Ordem de lançamento incompleta');
  return errors;
}
