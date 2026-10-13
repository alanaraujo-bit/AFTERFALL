import { getSeries } from '@/state/journey';

/** Ícones originais por produção (traço 1.6, grade 24). */
const PATHS: Record<string, string> = {
  // estrada que some no horizonte
  twd: 'M2 15h20M12 15 4.5 22M12 15l7.5 7M12 15v1.5m0 2v1.5',
  // sol sobre o mar
  ftwd: 'M3 14h18M7 14a5 5 0 0 1 10 0M3 18c2 0 2-1.2 4.5-1.2S10 18 12 18s2-1.2 4.5-1.2S19 18 21 18M12 5v2M5.6 7.6l1.4 1.4M18.4 7.6 17 9',
  // bússola
  wb: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  // livro aberto
  tales: 'M3 6c3-1 6-1 9 1v12c-3-2-6-2-9-1V6Zm18 0c-3-1-6-1-9 1v12c3-2 6-2 9-1V6Z',
  // dois anéis entrelaçados
  towl: 'M9.5 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm5 0a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z',
  // arco gótico
  dd: 'M5 21V11a7 7 0 0 1 14 0v10M9 21v-8a3 3 0 0 1 6 0v8M3 21h18M12 4V2',
  // horizonte urbano
  dc: 'M3 21V11h4v10M7 21V6h5v15M12 21V9h3v12M15 21V4h4v17M2 21h20',
};

const EXTRA = 'M4 6h16v12H4zM4 9h16M4 15h16M8 6v3M12 6v3M16 6v3M8 15v3M12 15v3M16 15v3';

export function SeriesGlyph({ seriesId, className = 'size-5' }: { seriesId: string; className?: string }) {
  const series = getSeries(seriesId);
  const d = PATHS[seriesId] ?? EXTRA;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ color: series?.accent }}
    >
      <path d={d} />
    </svg>
  );
}
