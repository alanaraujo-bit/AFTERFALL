/**
 * Disponibilidade legal no Brasil, conforme reportagens datadas. Não são páginas oficiais e
 * catálogos de streaming mudam: a UI sempre mostra a data e a fonte, e não cria links
 * diretos para plataformas. Nenhum link de player ou pirataria é exibido.
 */
export interface AvailabilityReport {
  seriesId: string;
  service: string;
  detail?: string;
  asOf: string;
  sourceLabel: string;
  sourceUrl: string;
}

const OMELETE_GUIA = 'https://www.omelete.com.br/walking-dead/walking-dead-derivados-guia';
const CORREIO = 'https://www.correiobraziliense.com.br/webstories/flipar/2025/01/7042743-serie-derivada-de-the-walking-dead-retorna-em-2025-veja-onde-assistir-aos-spin-offs.html';

export const AVAILABILITY: AvailabilityReport[] = [
  { seriesId: 'twd', service: 'Disney+', detail: '11 temporadas', asOf: 'jan/2025', sourceLabel: 'Correio Braziliense', sourceUrl: CORREIO },
  { seriesId: 'ftwd', service: 'Prime Video', asOf: 'out/2024', sourceLabel: 'Omelete', sourceUrl: OMELETE_GUIA },
  { seriesId: 'wb', service: 'Prime Video', asOf: 'jan/2025', sourceLabel: 'Correio Braziliense', sourceUrl: CORREIO },
  { seriesId: 'tales', service: 'Prime Video', asOf: 'out/2024', sourceLabel: 'Omelete', sourceUrl: OMELETE_GUIA },
  { seriesId: 'towl', service: 'Prime Video', asOf: 'out/2024', sourceLabel: 'Omelete', sourceUrl: OMELETE_GUIA },
  {
    seriesId: 'dd',
    service: 'Prime Video',
    detail: 'T1–T2; T3 anunciada para a plataforma',
    asOf: 'out/2025',
    sourceLabel: 'Omelete',
    sourceUrl: 'https://www.omelete.com.br/series-tv/the-walking-dead-daryl-dixon-onde-assistir',
  },
  {
    seriesId: 'dc',
    service: 'Prime Video',
    detail: 'T1–T2',
    asOf: 'jul/2026',
    sourceLabel: 'Omelete',
    sourceUrl: 'https://www.omelete.com.br/series-tv/the-walking-dead-dead-city-quando-estreia-3a-temporada-brasil',
  },
  {
    seriesId: 'dc',
    service: 'Canal AMC',
    detail: 'T3 com estreia anunciada para outubro de 2026',
    asOf: 'jul/2026',
    sourceLabel: 'Omelete',
    sourceUrl: 'https://www.omelete.com.br/series-tv/the-walking-dead-dead-city-quando-estreia-3a-temporada-brasil',
  },
];
