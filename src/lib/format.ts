import type { Episode, Series } from '@/domain/types';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const intFmt = new Intl.NumberFormat('pt-BR');

export const formatInt = (n: number) => intFmt.format(n);
export const formatPercent = (ratio: number) =>
  `${ratio > 0 && ratio < 0.01 ? '<1' : Math.floor(ratio * 100)}%`;

/** Datas de exibição (sem fuso: tratadas como UTC). */
export const formatAirdate = (iso: string | null) => (iso ? dateFmt.format(new Date(`${iso}T00:00:00Z`)).replace('.', '') : '—');
export const formatMonth = (iso: string) => monthFmt.format(new Date(`${iso}-01T00:00:00Z`)).replace('.', '');
export const formatShortDate = (d: Date) => shortDate.format(d).replace('.', '');

export function formatMinutes(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h >= 100) return `${intFmt.format(h)} h`;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `há ${diff} dias`;
  return formatShortDate(d);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "T3 · E05" para séries, "Parte 3" para webisódios. */
export function episodeCode(ep: Pick<Episode, 'kind' | 'season' | 'number'>): string {
  return ep.kind === 'extra' ? `Parte ${ep.number}` : `T${ep.season} · E${pad2(ep.number)}`;
}

export function plural(n: number, one: string, many: string) {
  return `${formatInt(n)} ${n === 1 ? one : many}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Noite longa';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const seriesLabel = (s: Series) => (s.kind === 'extra' ? `${s.shortTitle} · webisódio` : s.shortTitle);
