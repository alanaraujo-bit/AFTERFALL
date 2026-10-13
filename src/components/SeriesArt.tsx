import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { getSeries } from '@/state/journey';

/**
 * Arte original e procedural por produção: céu tingido pela cor da série, sol baixo, névoa e
 * uma silhueta de paisagem. Nenhuma imagem de terceiros.
 */
const LANDSCAPE: Record<string, { far: string; near: string; sun: [number, number, number] }> = {
  // pinheiros da Geórgia e uma estrada
  twd: {
    far: 'M0 150 L20 128 L30 140 L44 112 L58 138 L70 120 L84 142 L100 116 L116 140 L130 124 L150 146 L170 118 L186 140 L204 122 L220 144 L238 114 L254 138 L270 126 L290 146 L306 120 L322 140 L340 116 L356 138 L374 124 L400 144 V200 H0Z',
    near: 'M0 178 L40 170 L120 172 L190 166 L200 166 L210 166 L280 172 L360 168 L400 176 V200 H0Z',
    sun: [300, 120, 30],
  },
  // linha do mar
  ftwd: {
    far: 'M0 150 C40 146 80 152 120 149 S200 146 240 150 S330 152 400 148 V200 H0Z',
    near: 'M0 172 C50 168 90 176 140 172 S230 168 280 173 S360 176 400 170 V200 H0Z',
    sun: [110, 142, 38],
  },
  // planície aberta com torres distantes
  wb: {
    far: 'M0 156 L90 150 L92 118 L95 118 L97 150 L210 152 L212 128 L214 128 L216 152 L400 148 V200 H0Z',
    near: 'M0 176 C80 168 160 180 240 172 S350 170 400 178 V200 H0Z',
    sun: [320, 130, 26],
  },
  // colinas baixas
  tales: {
    far: 'M0 152 C60 124 110 150 170 136 S280 120 330 140 S380 150 400 144 V200 H0Z',
    near: 'M0 176 C70 160 140 178 210 168 S330 164 400 176 V200 H0Z',
    sun: [200, 138, 34],
  },
  // ruínas de uma cidade ao longe
  towl: {
    far: 'M0 160 H40 V138 H52 V128 H66 V146 H90 V120 H104 V150 H140 V132 H150 V112 H162 V146 H220 V126 H236 V150 H280 V136 H300 V118 H312 V150 H400 V200 H0Z',
    near: 'M0 180 C90 170 180 184 260 174 S360 172 400 180 V200 H0Z',
    sun: [86, 126, 30],
  },
  // abadia gótica
  dd: {
    far: 'M0 156 L120 154 V126 L128 108 L136 126 V140 H156 V112 L170 82 L184 112 V140 H204 V126 L212 108 L220 126 V154 L400 152 V200 H0Z',
    near: 'M0 178 C80 170 160 182 250 172 S350 170 400 178 V200 H0Z',
    sun: [300, 128, 28],
  },
  // skyline de Manhattan e uma ponte
  dc: {
    far: 'M0 158 H20 V120 H34 V158 H44 V96 H58 V158 H70 V110 H86 V60 H94 V110 H104 V158 H118 V128 H132 V158 H150 V104 H166 V158 H400 V200 H0Z M230 158 L250 112 L270 158 M330 158 L350 112 L370 158 M210 150 Q290 112 390 150',
    near: 'M0 180 H400 V200 H0Z',
    sun: [300, 118, 26],
  },
};

export function SeriesArt({
  seriesId,
  className,
  children,
  intensity = 1,
}: {
  seriesId: string;
  className?: string;
  children?: ReactNode;
  intensity?: number;
}) {
  const series = getSeries(seriesId);
  const accent = series?.accent ?? '#888888';
  const base = series?.parentId ?? seriesId;
  const land = LANDSCAPE[base] ?? LANDSCAPE.twd!;
  const [sx, sy, sr] = land.sun;
  // A paisagem ocupa a faixa inferior e estica na horizontal; céu e sol são CSS, então
  // nada é cortado em telas largas ou baixas.
  const landH = 'min(58%, 15rem)';
  const sunBottom = `calc(${landH} * ${((200 - sy) / 140).toFixed(3)})`;
  const sky = `linear-gradient(180deg, var(--bg-deep) 0%, color-mix(in srgb, ${accent} ${Math.round(24 * intensity)}%, var(--bg-deep)) 62%, color-mix(in srgb, ${accent} ${Math.round(42 * intensity)}%, var(--bg-deep)) 100%)`;
  const sun = `radial-gradient(circle, color-mix(in srgb, ${accent} 92%, white) 0 9%, color-mix(in srgb, ${accent} ${Math.round(45 * intensity)}%, transparent) 22%, transparent 68%)`;

  return (
    <div
      className={clsx(!className?.includes('absolute') && 'relative', 'isolate overflow-hidden bg-bg-deep', className)}
      style={{ backgroundImage: sky }}
    >
      <div
        className="pointer-events-none absolute aspect-square -translate-x-1/2 translate-y-1/2 rounded-full"
        style={{
          left: `${(sx / 400) * 100}%`,
          bottom: sunBottom,
          width: `clamp(8rem, ${(sr * 0.5).toFixed(1)}vw, 20rem)`,
          background: sun,
          opacity: Math.min(1, 0.9 * intensity),
        }}
        aria-hidden
      />
      <svg
        viewBox="0 60 400 140"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full"
        style={{ height: landH }}
        aria-hidden
      >
        <path d={land.far} fill="var(--bg-deep)" opacity="0.74" />
        <path d={land.far} fill="none" stroke={accent} strokeOpacity="0.22" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <path d={land.near} fill="var(--bg-deep)" />
      </svg>
      <div className="fog drift pointer-events-none absolute inset-x-[-10%] bottom-0 h-2/3 opacity-80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent" aria-hidden />
      {children !== undefined && <div className="relative h-full">{children}</div>}
    </div>
  );
}
