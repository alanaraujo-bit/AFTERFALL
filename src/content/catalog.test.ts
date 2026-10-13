import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { validateCatalog } from '@/domain/validate';
import { buildIndex, getNextUp, getOrder } from '@/domain/engine';
import generated from './generated/episodes.json';

describe('catálogo real', () => {
  it('passa na validação de integridade', () => {
    expect(validateCatalog(catalog, generated.cutoff)).toEqual([]);
  });

  it('contagens conferem com a Wikipedia em todas as temporadas', () => {
    for (const s of generated.series) {
      for (const [season, check] of Object.entries(s.crossCheck)) {
        expect(check.match, `${s.id} T${season}`).toBe(true);
      }
    }
  });

  it('cobre as 7 produções principais e 8 webisódios', () => {
    expect(catalog.series.filter((s) => s.kind === 'main')).toHaveLength(7);
    expect(catalog.series.filter((s) => s.kind === 'extra')).toHaveLength(8);
  });

  it('ordem cronológica começa na Queda e termina depois do fim', () => {
    const index = buildIndex(catalog);
    const order = getOrder(index, { mode: 'chronological', includeExtras: false });
    expect(index.entryOf.get(order[0]!)?.phaseId).toBe('fall');
    expect(index.entryOf.get(order.at(-1)!)?.phaseId).toBe('after');
    // A série-mãe aparece em ordem crescente dentro da cronologia
    const twd = order.filter((id) => id.startsWith('twd-'));
    expect(twd).toEqual([...twd].sort());
    expect(order.indexOf('ftwd-s01e01')).toBeLessThan(order.indexOf('twd-s01e01'));
    expect(order.indexOf('twd-s08e16')).toBeLessThan(order.indexOf('ftwd-s04e01'));
    expect(order.indexOf('wb-s02e10')).toBeLessThan(order.indexOf('twd-s09e06'));
  });

  it('quem já viu toda a série-mãe recebe o primeiro pendente da cronologia', () => {
    const index = buildIndex(catalog);
    const order = getOrder(index, { mode: 'chronological', includeExtras: true });
    const now = Date.now();
    const p = new Map(
      order
        .filter((id) => id.startsWith('twd-'))
        .map((id) => [id, { episodeId: id, status: 'completed' as const, favorite: false, completedAt: null, note: '', updatedAt: now }]),
    );
    expect(getNextUp(order, p)).toBe(order[0]);
    expect(order[0]).toBe('tales-s01e02');
  });

  it('ordem de lançamento começa no piloto de 2010', () => {
    const index = buildIndex(catalog);
    expect(index.release[0]).toBe('twd-s01e01');
  });
});
