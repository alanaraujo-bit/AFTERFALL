import { describe, expect, it } from 'vitest';
import {
  buildIndex,
  canShowTitle,
  countSkipped,
  getNextMilestone,
  getNextUp,
  getOrder,
  getQueue,
  getTransition,
  summarize,
  sumRuntime,
} from './engine';
import { makeCatalog, progress } from '@/test/fixtures';

const index = buildIndex(makeCatalog());
const CHRONO = ['a-s01e01', 'a-s01e02', 'b-s01e01', 'x-s01e01', 'b-s01e02', 'a-s02e01', 'a-s02e02'];

describe('ordem da jornada', () => {
  it('cronológica é determinística e independe da ordem de lançamento', () => {
    expect(getOrder(index, { mode: 'chronological', includeExtras: true })).toEqual(CHRONO);
    for (let i = 0; i < 5; i++) expect(buildIndex(makeCatalog()).chronological).toEqual(CHRONO);
  });

  it('lançamento ordena por data de exibição', () => {
    expect(getOrder(index, { mode: 'release', includeExtras: true })).toEqual([
      'a-s01e01',
      'a-s01e02',
      'a-s02e01',
      'a-s02e02',
      'x-s01e01',
      'b-s01e01',
      'b-s01e02',
    ]);
  });

  it('ocultar extras remove apenas os extras', () => {
    expect(getOrder(index, { mode: 'chronological', includeExtras: false })).toEqual(
      CHRONO.filter((id) => id !== 'x-s01e01'),
    );
  });

  it('nunca duplica um episódio que aparece em dois blocos', () => {
    const cat = makeCatalog();
    cat.entries.push({ id: 'dup', phaseId: 'p2', seriesId: 'a', season: 1, from: 1, to: 1, confidence: 'high', sourceIds: [] });
    const ids = buildIndex(cat).chronological;
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('próximo episódio', () => {
  const order = getOrder(index, { mode: 'chronological', includeExtras: true });

  it('estado inicial: primeiro episódio', () => {
    expect(getNextUp(order, new Map())).toBe('a-s01e01');
  });

  it('avança automaticamente após concluir', () => {
    expect(getNextUp(order, progress([['a-s01e01', 'completed', 1]]))).toBe('a-s01e02');
    expect(
      getNextUp(order, progress([['a-s01e01', 'completed', 1], ['a-s01e02', 'completed', 2]])),
    ).toBe('b-s01e01');
  });

  it('episódio concluído não retorna como próximo', () => {
    const p = progress([
      ['a-s01e01', 'completed', 1],
      ['a-s01e02', 'completed', 2],
      ['b-s01e01', 'completed', 3],
    ]);
    expect(getNextUp(order, p)).toBe('x-s01e01');
    expect(getQueue(order, p)).not.toContain('a-s01e01');
    expect(getQueue(order, p)).not.toContain('b-s01e01');
  });

  it('continua de onde parou mesmo com episódios pulados, e retoma os pulados no fim', () => {
    const p = progress([['b-s01e02', 'completed', 5]]);
    expect(getNextUp(order, p)).toBe('a-s02e01');
    expect(countSkipped(order, p, 'a-s02e01')).toBe(4);
    expect(getNextUp(order, progress([['a-s02e02', 'completed', 9]]))).toBe('a-s01e01');
  });

  it('episódio em andamento é retomado', () => {
    const p = progress([['a-s01e01', 'completed', 1], ['b-s01e01', 'in_progress', 2]]);
    expect(getNextUp(order, p)).toBe('b-s01e01');
  });

  it('jornada completa devolve null', () => {
    const p = progress(CHRONO.map((id, i) => [id, 'completed', i]));
    expect(getNextUp(order, p)).toBeNull();
    expect(getQueue(order, p)).toEqual([]);
  });

  it('marcar uma série inteira intercalada não pula o que fica entre seus episódios', () => {
    // A inteira de uma vez (A1, A2 … A2-1, A2-2), com B e o extra intercalados entre eles
    const p = progress(['a-s01e01', 'a-s01e02', 'a-s02e01', 'a-s02e02'].map((id) => [id, 'completed', 50]));
    expect(getNextUp(order, p)).toBe('b-s01e01');
    expect(countSkipped(order, p, 'b-s01e01')).toBe(0);
    // Um lote mais antigo e contíguo continua valendo como âncora
    const q = new Map(p);
    q.set('b-s01e01', { ...q.get('a-s01e01')!, episodeId: 'b-s01e01', updatedAt: 10 });
    expect(getNextUp(order, q)).toBe('x-s01e01');
    // Depois do lote, assistir o próximo normalmente segue a partir dele
    q.set('x-s01e01', { ...q.get('a-s01e01')!, episodeId: 'x-s01e01', updatedAt: 60 });
    expect(getNextUp(order, q)).toBe('b-s01e02');
  });

  it('marcação em lote (mesmo horário) usa a posição mais adiantada', () => {
    const p = progress([['a-s01e01', 'completed', 7], ['a-s01e02', 'completed', 7]]);
    expect(getNextUp(order, p)).toBe('b-s01e01');
  });
});

describe('preferências não alteram progresso', () => {
  it('trocar modo e extras recalcula a fila sem tocar no mapa de progresso', () => {
    const p = progress([['a-s01e01', 'completed', 1], ['x-s01e01', 'completed', 2]]);
    const before = JSON.stringify([...p]);
    const chrono = getOrder(index, { mode: 'chronological', includeExtras: true });
    const release = getOrder(index, { mode: 'release', includeExtras: false });
    expect(summarize(chrono, p).completed).toBe(2);
    expect(summarize(release, p).completed).toBe(1);
    expect(getNextUp(release, p)).toBe('a-s01e02');
    expect(JSON.stringify([...p])).toBe(before);
    expect(summarize(getOrder(index, { mode: 'release', includeExtras: true }), p).completed).toBe(2);
  });
});

describe('indicadores', () => {
  const order = getOrder(index, { mode: 'chronological', includeExtras: true });

  it('resumo de progresso', () => {
    const s = summarize(order, progress([['a-s01e01', 'completed', 1]]));
    expect(s).toMatchObject({ total: 7, completed: 1, remaining: 6 });
    expect(s.ratio).toBeCloseTo(1 / 7);
  });

  it('soma apenas durações conhecidas e informa as desconhecidas', () => {
    expect(sumRuntime(index, order, 'runtimeMinutes')).toEqual({ minutes: 45 * 4, unknown: 3 });
  });

  it('detecta transição entre produções', () => {
    expect(getTransition(index, order, 'b-s01e01')).toMatchObject({ fromSeriesId: 'a', toSeriesId: 'b' });
    expect(getTransition(index, order, 'a-s01e02')).toBeNull();
  });

  it('próximo marco é o início da próxima fase', () => {
    expect(getNextMilestone(index, order, 'a-s01e01')).toMatchObject({ episodeId: 'a-s02e01', distance: 5 });
  });

  it('spoiler shield esconde títulos futuros', () => {
    const p = progress([['a-s01e01', 'completed', 1]]);
    const opts = { shield: true, progress: p, nextUp: 'a-s01e02', revealed: new Set<string>() };
    expect(canShowTitle('a-s01e01', opts)).toBe(true);
    expect(canShowTitle('a-s01e02', opts)).toBe(true);
    expect(canShowTitle('b-s01e01', opts)).toBe(false);
    expect(canShowTitle('b-s01e01', { ...opts, revealed: new Set(['b-s01e01']) })).toBe(true);
    expect(canShowTitle('b-s01e01', { ...opts, shield: false })).toBe(true);
  });
});
