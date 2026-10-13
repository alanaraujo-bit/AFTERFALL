/**
 * Modelos do AFTERFALL.
 *
 * Conteúdo editorial (Series, Season, Episode, TimelinePhase, TimelineEntry, EditorialSource)
 * é estático e versionado em `src/content`. Dados do usuário (WatchProgress, WatchSession,
 * UserSettings) vivem no IndexedDB e referenciam episódios apenas pelo ID estável.
 */

export type SeriesId = string;
export type EpisodeId = string;

export type ContentKind = 'main' | 'extra';
export type Confidence = 'high' | 'medium' | 'approximate';

export interface EditorialSource {
  id: string;
  label: string;
  url: string;
  /** Data (ISO) da última verificação manual ou automática. */
  verifiedAt: string;
}

export interface SeriesText {
  /** Seguro para qualquer pessoa, mesmo quem nunca viu a série-mãe. */
  safe: string;
  /** Premissa completa; pode revelar desfechos de outras produções. */
  full?: string;
}

export interface Series {
  id: SeriesId;
  title: string;
  shortTitle: string;
  /** Sigla curta usada em chips e marcadores. */
  code: string;
  kind: ContentKind;
  /** Para extras: produção à qual o conteúdo está vinculado. */
  parentId?: SeriesId;
  years: string;
  network: string;
  description: SeriesText;
  /** Cor de identidade (hex). */
  accent: string;
  sourceIds: string[];
  /** Observações editoriais (ex.: formato, onde foi lançado). */
  formatNote?: string;
}

export interface Season {
  seriesId: SeriesId;
  number: number;
  label: string;
  episodeIds: EpisodeId[];
}

export interface Episode {
  id: EpisodeId;
  seriesId: SeriesId;
  season: number;
  number: number;
  titleOriginal: string | null;
  titlePt: string | null;
  /** Data de exibição/lançamento original (ISO). */
  airdate: string | null;
  /** Duração real verificada, em minutos. */
  runtimeMinutes: number | null;
  /** Duração da faixa de exibição na TV (inclui intervalos). Fonte: TVmaze. */
  slotRuntime: number | null;
  kind: ContentKind;
  tvmazeId: number | null;
  /** Sinopse curta e segura. Null quando não há texto verificado. */
  synopsis: string | null;
  sourceIds: string[];
}

export interface TimelinePhase {
  id: string;
  title: string;
  /** Ex.: "Ano 0", "~Ano 1–2". */
  era: string;
  /** Descrição curta sem spoilers. */
  summary: string;
  confidence: Confidence;
}

/**
 * Um bloco contíguo de episódios de uma temporada posicionado em uma fase.
 * A ordem cronológica completa é a concatenação dos blocos na ordem do arquivo.
 */
export interface TimelineEntry {
  id: string;
  phaseId: string;
  seriesId: SeriesId;
  season: number;
  /** Primeiro e último episódio (inclusive). */
  from: number;
  to: number;
  confidence: Confidence;
  /** Justificativa editorial curta, sem spoilers. */
  note?: string;
  sourceIds: string[];
}

export interface Catalog {
  version: string;
  verifiedAt: string;
  series: Series[];
  seasons: Season[];
  episodes: Episode[];
  phases: TimelinePhase[];
  entries: TimelineEntry[];
  sources: EditorialSource[];
}

/* ------------------------------------------------------------------ */
/* Dados do usuário                                                    */
/* ------------------------------------------------------------------ */

export type WatchStatus = 'unwatched' | 'in_progress' | 'completed';

export interface WatchProgress {
  episodeId: EpisodeId;
  status: WatchStatus;
  favorite: boolean;
  /** ISO. Presente apenas quando status = completed. */
  completedAt: string | null;
  note: string;
  /** Epoch ms da última alteração; usado para "retomar de onde parou". */
  updatedAt: number;
}

export type SessionAction = 'complete' | 'uncomplete' | 'start' | 'reset' | 'import';

export interface WatchSession {
  id?: number;
  action: SessionAction;
  episodeIds: EpisodeId[];
  at: string;
}

export type OrderMode = 'chronological' | 'release';
export type ThemePreference = 'dark' | 'light' | 'system';
export type MotionPreference = 'system' | 'reduced' | 'full';

export interface UserSettings {
  id: 'user';
  theme: ThemePreference;
  orderMode: OrderMode;
  includeExtras: boolean;
  motion: MotionPreference;
  spoilerShield: boolean;
  onboardingDone: boolean;
  timelineDensity: 'detailed' | 'compact';
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'user',
  theme: 'dark',
  orderMode: 'chronological',
  includeExtras: true,
  motion: 'system',
  spoilerShield: true,
  onboardingDone: false,
  timelineDensity: 'detailed',
};
