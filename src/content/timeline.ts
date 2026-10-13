import type { Confidence, TimelinePhase } from '@/domain/types';

/**
 * Cronologia editorial do AFTERFALL — versão 2026.10.
 *
 * Fontes: Wikipedia (artigos de cada série/temporada e tabela da franquia) para âncoras
 * declaradas; Fandom "Chronological Episode Order" para o encaixe entre produções.
 * Detalhes, divergências e justificativas: docs/research/chronology-notes.md.
 *
 * Os nomes e resumos das fases foram escritos para não revelar acontecimentos.
 * Para mudar a ordem, edite apenas este arquivo e rode `npm run data:validate`.
 */
export const TIMELINE_VERSION = '2026.10';

export const PHASES: TimelinePhase[] = [
  {
    id: 'fall',
    title: 'A Queda',
    era: 'Ano 0',
    summary:
      'Os primeiros dias do surto, vistos de lugares diferentes: a costa oeste em colapso e o interior da Geórgia, enquanto o mundo ainda tenta entender o que está acontecendo.',
    confidence: 'medium',
  },
  {
    id: 'road',
    title: 'Sobrevivência',
    era: '~Ano 1–2',
    summary: 'Sem governo e sem resgate, sobreviver passa a significar encontrar um lugar — e defendê-lo.',
    confidence: 'high',
  },
  {
    id: 'communities',
    title: 'Comunidades',
    era: '~Ano 2–3',
    summary: 'Pela primeira vez surgem lugares com muros, regras e algo parecido com futuro.',
    confidence: 'high',
  },
  {
    id: 'horizons',
    title: 'Novos horizontes',
    era: '~Ano 3–5',
    summary:
      'As histórias começam a correr em paralelo: personagens cruzam o país, e uma série salta no tempo enquanto a outra muda de cenário.',
    confidence: 'medium',
  },
  {
    id: 'lost-years',
    title: 'Os Anos Perdidos',
    era: '~Ano 5–10',
    summary:
      'O intervalo de seis anos que a série-mãe não mostra. Outras produções preenchem esse período em outros lugares do país.',
    confidence: 'medium',
  },
  {
    id: 'six-years',
    title: 'Seis anos depois',
    era: '~Ano 10–11',
    summary: 'A série-mãe retorna depois do salto temporal. Uma nova geração já cresceu dentro dos muros.',
    confidence: 'high',
  },
  {
    id: 'final-chapter',
    title: 'O último capítulo',
    era: '~Ano 11–13',
    summary: 'A reta final da série-mãe e de Fear, que acontecem aproximadamente no mesmo período.',
    confidence: 'approximate',
  },
  {
    id: 'after',
    title: 'Depois do fim',
    era: 'Anos seguintes',
    summary:
      'As continuações, que acontecem em paralelo após o final da série-mãe, cada uma em um canto diferente do mundo. A distância exata no tempo varia conforme a fonte.',
    confidence: 'approximate',
  },
];

/** `to: 'all'` = temporada inteira, resolvida a partir dos dados gerados. */
export interface EntrySpec {
  phaseId: string;
  seriesId: string;
  season: number;
  from?: number;
  to?: number | 'all';
  confidence: Confidence;
  note?: string;
  sourceIds: string[];
}

const W = ['wiki-franchise'];
const F = ['fandom-order'];
const WF = ['wiki-franchise', 'fandom-order'];

export const ENTRIES: EntrySpec[] = [
  // 1. A Queda
  { phaseId: 'fall', seriesId: 'tales', season: 1, from: 2, to: 2, confidence: 'medium', note: 'Episódio de antologia ambientado nos primeiros dias do surto.', sourceIds: F },
  { phaseId: 'fall', seriesId: 'torn-apart', season: 1, confidence: 'high', note: 'Webisódio ambientado antes do primeiro episódio de The Walking Dead.', sourceIds: W },
  { phaseId: 'fall', seriesId: 'ftwd', season: 1, from: 1, to: 3, confidence: 'high', note: 'Fear começa no início do surto — enquanto, na série-mãe, o protagonista ainda está em coma.', sourceIds: ['wiki-ftwd', ...F] },
  { phaseId: 'fall', seriesId: 'flight-462', season: 1, confidence: 'high', note: 'Webisódio que se passa durante o 3º episódio de Fear.', sourceIds: W },
  { phaseId: 'fall', seriesId: 'ftwd', season: 1, from: 4, to: 'all', confidence: 'high', sourceIds: ['wiki-ftwd', ...F] },
  { phaseId: 'fall', seriesId: 'dead-in-the-water', season: 1, confidence: 'medium', note: 'Ambientado no período do surto; as fontes o descrevem como prelúdio da 6ª temporada de Fear. Também funciona assistido antes dela.', sourceIds: WF },
  { phaseId: 'fall', seriesId: 'ftwd', season: 2, confidence: 'high', sourceIds: ['wiki-ftwd', ...F] },
  { phaseId: 'fall', seriesId: 'passage', season: 1, confidence: 'medium', note: 'Fontes situam o webisódio durante a 2ª temporada de Fear / antes da 3ª.', sourceIds: WF },
  { phaseId: 'fall', seriesId: 'ftwd', season: 3, confidence: 'medium', note: 'As três primeiras temporadas de Fear são prelúdios; o encaixe dia a dia com a série-mãe não é declarado oficialmente.', sourceIds: ['wiki-ftwd', ...F] },
  { phaseId: 'fall', seriesId: 'tales', season: 1, from: 6, to: 6, confidence: 'approximate', note: 'Posição incerta: a própria fonte indica que o encaixe deste episódio é uma estimativa.', sourceIds: F },
  { phaseId: 'fall', seriesId: 'cold-storage', season: 1, confidence: 'medium', note: 'Webisódio ambientado antes da primeira temporada de The Walking Dead.', sourceIds: WF },
  { phaseId: 'fall', seriesId: 'the-oath', season: 1, confidence: 'high', note: 'Webisódio ambientado antes da primeira temporada de The Walking Dead.', sourceIds: W },
  { phaseId: 'fall', seriesId: 'twd', season: 1, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'fall', seriesId: 'twd', season: 2, confidence: 'high', sourceIds: ['wiki-twd'] },

  // 2. Sobrevivência
  { phaseId: 'road', seriesId: 'twd', season: 3, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'road', seriesId: 'tales', season: 1, from: 1, to: 1, confidence: 'medium', note: 'Encaixe estimado por fãs a partir de pistas do episódio.', sourceIds: F },
  { phaseId: 'road', seriesId: 'twd', season: 4, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'road', seriesId: 'twd', season: 5, from: 1, to: 11, confidence: 'high', sourceIds: ['wiki-twd'] },

  // 3. Comunidades
  { phaseId: 'communities', seriesId: 'twd', season: 5, from: 12, to: 'all', confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'communities', seriesId: 'twd', season: 6, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'communities', seriesId: 'twd', season: 7, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'communities', seriesId: 'twd', season: 8, confidence: 'high', sourceIds: ['wiki-twd'] },
  { phaseId: 'communities', seriesId: 'red-machete', season: 1, confidence: 'medium', note: 'Atravessa vários períodos do apocalipse até depois da 8ª temporada; recomendado assistir aqui, de uma vez.', sourceIds: WF },

  // 4. Novos horizontes
  { phaseId: 'horizons', seriesId: 'ftwd', season: 4, confidence: 'high', note: 'A linha do presente começa depois da 8ª temporada de The Walking Dead; parte da temporada usa flashbacks.', sourceIds: ['wiki-ftwd-s4', ...F] },
  { phaseId: 'horizons', seriesId: 'tales', season: 1, from: 3, to: 3, confidence: 'medium', note: 'Encaixe estimado por fãs.', sourceIds: F },
  { phaseId: 'horizons', seriesId: 'ftwd', season: 5, from: 1, to: 8, confidence: 'medium', sourceIds: F },
  { phaseId: 'horizons', seriesId: 'althea-tapes', season: 1, confidence: 'medium', note: 'A maior parte se passa antes da 4ª temporada de Fear, mas a última parte fica entre os episódios 8 e 9 da 5ª — por isso o conjunto entra aqui.', sourceIds: WF },
  { phaseId: 'horizons', seriesId: 'ftwd', season: 5, from: 9, to: 'all', confidence: 'medium', sourceIds: F },
  { phaseId: 'horizons', seriesId: 'twd', season: 9, from: 1, to: 5, confidence: 'high', note: 'Começa cerca de um ano e meio após a 8ª temporada. A ordem relativa a Fear 5 vem de fontes de fãs.', sourceIds: ['wiki-twd-s9', ...F] },

  // 5. Os Anos Perdidos
  { phaseId: 'lost-years', seriesId: 'ftwd', season: 6, confidence: 'medium', sourceIds: F },
  { phaseId: 'lost-years', seriesId: 'ftwd', season: 7, confidence: 'medium', sourceIds: F },
  { phaseId: 'lost-years', seriesId: 'tales', season: 1, from: 4, to: 4, confidence: 'medium', note: 'Encaixe estimado por fãs a partir de pistas do episódio.', sourceIds: F },
  { phaseId: 'lost-years', seriesId: 'wb', season: 1, confidence: 'high', note: 'Ambientada dez anos após o início do apocalipse.', sourceIds: ['wiki-wb'] },
  { phaseId: 'lost-years', seriesId: 'wb', season: 2, confidence: 'high', sourceIds: ['wiki-wb'] },

  // 6. Seis anos depois
  { phaseId: 'six-years', seriesId: 'twd', season: 9, from: 6, to: 'all', confidence: 'high', note: 'Retoma a série-mãe após o salto de seis anos.', sourceIds: ['wiki-twd-s9'] },
  { phaseId: 'six-years', seriesId: 'twd', season: 10, confidence: 'high', sourceIds: ['wiki-twd'] },

  // 7. O último capítulo
  { phaseId: 'final-chapter', seriesId: 'twd', season: 11, from: 1, to: 12, confidence: 'high', sourceIds: ['wiki-twd-s11'] },
  { phaseId: 'final-chapter', seriesId: 'ftwd', season: 8, confidence: 'approximate', note: 'A 8ª temporada salta sete anos. O encaixe no meio da 11ª temporada da série-mãe é uma estimativa de fãs.', sourceIds: ['wiki-ftwd-s8', ...F] },
  { phaseId: 'final-chapter', seriesId: 'twd', season: 11, from: 13, to: 'all', confidence: 'high', sourceIds: ['wiki-twd-s11'] },

  // 8. Depois do fim
  { phaseId: 'after', seriesId: 'towl', season: 1, confidence: 'medium', note: 'O presente acontece depois do final da série-mãe; parte da história recupera os anos anteriores.', sourceIds: ['wiki-towl', ...F] },
  { phaseId: 'after', seriesId: 'dd', season: 1, confidence: 'high', note: 'Começa depois do epílogo da série-mãe.', sourceIds: ['wiki-dd', ...F] },
  { phaseId: 'after', seriesId: 'dd', season: 2, confidence: 'high', sourceIds: ['wiki-dd'] },
  { phaseId: 'after', seriesId: 'dd', season: 3, confidence: 'high', sourceIds: ['wiki-dd'] },
  { phaseId: 'after', seriesId: 'tales', season: 1, from: 5, to: 5, confidence: 'approximate', note: 'Sem datação oficial; posição estimada por fãs.', sourceIds: F },
  { phaseId: 'after', seriesId: 'dc', season: 1, confidence: 'medium', note: 'Alguns anos após o final da série-mãe — a distância exata diverge entre as fontes.', sourceIds: ['wiki-dc', 'syfy-dc', ...F] },
  { phaseId: 'after', seriesId: 'dc', season: 2, confidence: 'high', sourceIds: ['wiki-dc'] },
  { phaseId: 'after', seriesId: 'dc', season: 3, confidence: 'high', sourceIds: ['wiki-dc'] },
];
