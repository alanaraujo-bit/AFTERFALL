/**
 * Correções editoriais sobre os dados gerados, sempre com fonte.
 * Origem: divergências apontadas por `npm run data:titles` (TVmaze × Wikipedia), revisadas
 * em 2026-10-13. A grafia oficial dos títulos de Tales usa barra; TVmaze usa ponto e vírgula.
 */
export const TITLE_OVERRIDES: Record<string, { title: string; sourceId: string }> = {
  'tales-s01e01': { title: 'Evie / Joe', sourceId: 'wiki-tales' },
  'tales-s01e02': { title: 'Blair / Gina', sourceId: 'wiki-tales' },
  'tales-s01e04': { title: 'Amy / Dr. Everett', sourceId: 'wiki-tales' },
  'twd-s11e01': { title: 'Acheron: Part I', sourceId: 'wiki-twd-s11' },
  'twd-s11e02': { title: 'Acheron: Part II', sourceId: 'wiki-twd-s11' },
};
