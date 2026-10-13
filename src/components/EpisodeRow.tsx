import { memo } from 'react';
import { Link } from 'react-router';
import { clsx } from 'clsx';
import { Eye, Heart, StickyNote } from 'lucide-react';
import { WatchToggle } from './WatchToggle';
import { SeriesGlyph } from './SeriesGlyph';
import { actions, getEpisode, getSeries, statusOf, useTitleGate, type Journey } from '@/state/journey';
import { useUI } from '@/state/ui';
import { episodeCode, formatAirdate } from '@/lib/format';

export function EpisodeTitle({
  journey,
  episodeId,
  className,
  revealable = true,
}: {
  journey: Journey | undefined;
  episodeId: string;
  className?: string;
  revealable?: boolean;
}) {
  const gate = useTitleGate(journey);
  const reveal = useUI((s) => s.reveal);
  const ep = getEpisode(episodeId);
  if (!ep) return null;
  const title = gate(ep);
  if (title === '') return <span className={clsx(className, 'text-faint')}>Sem título</span>;
  if (title !== null) return <span className={className}>{title}</span>;
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span className="truncate italic text-faint">Título oculto</span>
      {revealable && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            reveal(ep.id);
          }}
          className="relative z-10 -m-2 inline-grid size-8 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-3 hover:text-text"
          aria-label={`Revelar título de ${episodeCode(ep)}`}
          title="Revelar título (pode conter spoiler)"
        >
          <Eye className="size-3.5" />
        </button>
      )}
    </span>
  );
}

export const EpisodeRow = memo(function EpisodeRow({
  journey,
  episodeId,
  density = 'detailed',
  showSeries = false,
  selected,
  onSelect,
}: {
  journey: Journey;
  episodeId: string;
  density?: 'detailed' | 'compact';
  showSeries?: boolean;
  /** Modo seleção em lote. */
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const gate = useTitleGate(journey);
  const reveal = useUI((s) => s.reveal);
  const ep = getEpisode(episodeId);
  if (!ep) return null;
  const series = getSeries(ep.seriesId)!;
  const hidden = gate(ep) === null;
  const status = statusOf(journey.progress, ep.id);
  const p = journey.progress.get(ep.id);
  const isNext = journey.nextUp === ep.id;
  const compact = density === 'compact';
  const selecting = onSelect !== undefined;

  return (
    <div
      className={clsx(
        'group relative flex items-center gap-2 rounded-2xl pr-2 transition-colors duration-200',
        compact ? 'min-h-12 pl-1' : 'min-h-16 pl-1.5',
        isNext ? 'bg-accent-soft ring-1 ring-accent/35' : 'hover:bg-surface-2',
        selected && 'bg-surface-2 ring-1 ring-line-strong',
      )}
      data-episode={ep.id}
      data-status={status}
    >
      {selecting ? (
        <label className="relative z-10 grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={!!selected}
            onChange={() => onSelect(ep.id)}
            aria-label={`Selecionar ${series.shortTitle} ${episodeCode(ep)}`}
          />
        </label>
      ) : (
        <WatchToggle
          status={status}
          size={compact ? 'sm' : 'md'}
          label={`${status === 'completed' ? 'Desmarcar' : 'Marcar como assistido'}: ${series.shortTitle} ${episodeCode(ep)}`}
          onToggle={() => void actions.toggle(ep.id, status)}
        />
      )}
      <Link
        to={`/episodio/${ep.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 after:absolute after:inset-0 after:content-['']"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase">
            {showSeries && (
              <span className="inline-flex items-center gap-1" style={{ color: `color-mix(in srgb, ${series.accent} 75%, var(--text))` }}>
                <SeriesGlyph seriesId={series.id} className="size-3.5" />
                {series.code}
              </span>
            )}
            <span className="tabular">{episodeCode(ep)}</span>
            {ep.kind === 'extra' && <span className="text-faint">· extra</span>}
            {isNext && <span className="text-accent-ink">· próximo</span>}
          </div>
          <div
            className={clsx(
              'mt-0.5 flex min-w-0 items-center text-[0.9375rem] leading-snug',
              status === 'completed' ? 'text-muted' : 'text-text',
              !compact && 'font-medium',
            )}
          >
            <EpisodeTitle journey={journey} episodeId={ep.id} className="truncate" revealable={false} />
          </div>
          {!compact && (
            <div className="mt-0.5 text-xs text-faint tabular">
              {formatAirdate(ep.airdate)}
              {ep.runtimeMinutes ? ` · ${Math.round(ep.runtimeMinutes)} min` : ''}
            </div>
          )}
        </div>
      </Link>
      <div className="relative z-10 flex shrink-0 items-center gap-1 text-faint">
        {hidden && (
          <button
            type="button"
            onClick={() => reveal(ep.id)}
            className="grid size-9 place-items-center rounded-full text-faint hover:bg-surface-3 hover:text-text"
            aria-label={`Revelar título de ${series.shortTitle} ${episodeCode(ep)}`}
            title="Revelar título (pode conter spoiler)"
          >
            <Eye className="size-4" />
          </button>
        )}
        {p?.note && <StickyNote className="size-3.5" aria-label="Tem nota" />}
        {p?.favorite && <Heart className="size-3.5 fill-accent text-accent" aria-label="Favorito" />}
      </div>
    </div>
  );
});
