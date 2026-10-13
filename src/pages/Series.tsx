import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCheck, ExternalLink, Eye, ListChecks, Tv, X } from 'lucide-react';
import { Container } from '@/components/Page';
import { SeriesArt } from '@/components/SeriesArt';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { EpisodeRow } from '@/components/EpisodeRow';
import { ConfirmDialog } from '@/components/dialogs';
import { Button, Chip, EmptyState, IconButton, ProgressBar, Segmented, Skeleton } from '@/components/ui';
import { INDEX, actions, getSeries, useJourney, type Journey } from '@/state/journey';
import { summarize } from '@/domain/engine';
import { AVAILABILITY } from '@/content/availability';
import { formatPercent, plural } from '@/lib/format';
import { NotFoundPage } from './NotFound';
import type { Season, Series } from '@/domain/types';

type Filter = 'all' | 'pending' | 'done' | 'fav';

export function SeriesPage() {
  const { seriesId = '' } = useParams();
  const series = getSeries(seriesId);
  const journey = useJourney();
  if (!series) return <NotFoundPage />;
  return <SeriesView series={series} journey={journey} />;
}

function SeriesView({ series, journey }: { series: Series; journey: Journey | undefined }) {
  const seasons = INDEX.catalog.seasons.filter((s) => s.seriesId === series.id);
  const ids = seasons.flatMap((s) => s.episodeIds);
  const [filter, setFilter] = useState<Filter>('all');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFull, setShowFull] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; ids: string[]; label: string; undo?: boolean } | null>(null);
  const parent = series.parentId ? getSeries(series.parentId) : undefined;
  const children = INDEX.catalog.series.filter((s) => s.parentId === series.id);
  const availability = AVAILABILITY.filter((a) => a.seriesId === series.id);
  const sources = series.sourceIds.map((id) => INDEX.catalog.sources.find((s) => s.id === id)).filter((s) => !!s);
  const s = journey ? summarize(ids, journey.progress) : null;
  const shield = journey?.settings.spoilerShield ?? true;

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <SeriesArt seriesId={series.id} className="h-[22rem] sm:h-[26rem]" intensity={1.15}>
        <Container wide className="flex h-full flex-col justify-end pb-8 safe-top">
          <Link to="/biblioteca" className="mb-auto pt-4 text-sm text-text/80 hover:text-text lg:pt-8">
            ← Biblioteca
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold text-text/85">
            <SeriesGlyph seriesId={series.id} className="size-4" />
            {series.kind === 'extra' ? `Webisódio · ${parent?.title}` : series.network}
            <span className="text-text/50">·</span>
            <span className="tabular">{series.years}</span>
          </div>
          <h1 className="display mt-2 max-w-4xl text-5xl text-text sm:text-6xl lg:text-7xl">{series.title}</h1>
        </Container>
      </SeriesArt>

      <Container wide className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-text/90">
            {showFull || !shield ? (series.description.full ?? series.description.safe) : series.description.safe}
          </p>
          {series.description.full && shield && !showFull && (
            <button onClick={() => setShowFull(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline">
              <Eye className="size-4" /> Ver premissa completa (revela personagens)
            </button>
          )}
          {series.formatNote && <p className="mt-3 text-sm text-muted">{series.formatNote}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Segmented
              label="Filtrar episódios"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendentes' },
                { value: 'done', label: 'Vistos' },
                { value: 'fav', label: 'Favoritos' },
              ]}
              className="w-full sm:w-auto"
            />
            <div className="ml-auto flex items-center gap-1">
              {selecting ? (
                <>
                  <span className="mr-1 text-sm text-muted tabular">{selected.size} selecionados</span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!selected.size}
                    onClick={() => {
                      void actions.complete([...selected]);
                      setSelected(new Set());
                      setSelecting(false);
                    }}
                  >
                    Marcar vistos
                  </Button>
                  <Button
                    size="sm"
                    disabled={!selected.size}
                    onClick={() => {
                      void actions.uncomplete([...selected]);
                      setSelected(new Set());
                      setSelecting(false);
                    }}
                  >
                    Desmarcar
                  </Button>
                  <IconButton label="Cancelar seleção" onClick={() => (setSelecting(false), setSelected(new Set()))}>
                    <X className="size-5" />
                  </IconButton>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" icon={<ListChecks className="size-4" />} onClick={() => setSelecting(true)}>
                    Selecionar
                  </Button>
                  {s && s.remaining > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<CheckCheck className="size-4" />}
                      onClick={() =>
                        setConfirm({
                          title: `Marcar ${series.kind === 'extra' ? 'todas as partes' : 'a série inteira'} como assistida?`,
                          ids: ids.filter((id) => journey?.progress.get(id)?.status !== 'completed'),
                          label: series.shortTitle,
                        })
                      }
                    >
                      Série vista
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {!journey ? (
            <div className="mt-6 space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              {seasons.map((season) => (
                <SeasonSection
                  key={season.number}
                  series={series}
                  season={season}
                  journey={journey}
                  filter={filter}
                  selected={selecting ? selected : undefined}
                  onSelect={selecting ? toggleSelected : undefined}
                  onMarkSeason={(pending, done) =>
                    setConfirm(
                      done
                        ? { title: `Desmarcar ${season.label.toLowerCase()}?`, ids: season.episodeIds, label: `${series.shortTitle} · ${season.label}`, undo: true }
                        : { title: `Marcar ${season.label.toLowerCase()} como assistida?`, ids: pending, label: `${series.shortTitle} · ${season.label}` },
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {s && (
            <div className="card p-5">
              <p className="eyebrow">Seu progresso</p>
              <p className="mt-2 text-3xl font-semibold text-text tabular">{s.ratio === 1 ? 'Concluída' : formatPercent(s.ratio)}</p>
              <ProgressBar value={s.ratio} className="mt-3" color={s.ratio === 1 ? 'var(--success)' : series.accent} label={`Progresso em ${series.title}`} />
              <p className="mt-2 text-xs text-muted tabular">
                {s.completed} de {s.total} · {plural(s.remaining, 'restante', 'restantes')}
              </p>
            </div>
          )}
          {availability.length > 0 && (
            <div className="card p-5">
              <p className="eyebrow flex items-center gap-1.5">
                <Tv className="size-3.5" aria-hidden /> Onde assistir no Brasil
              </p>
              <ul className="mt-3 space-y-3">
                {availability.map((a) => (
                  <li key={a.service + a.detail} className="text-sm">
                    <span className="font-semibold text-text">{a.service}</span>
                    {a.detail && <span className="text-muted"> — {a.detail}</span>}
                    <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-faint hover:text-text">
                      Segundo {a.sourceLabel}, {a.asOf} <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-faint">
                Informação de reportagens, não de fontes oficiais. Catálogos mudam — confirme no serviço.
              </p>
            </div>
          )}
          {children.length > 0 && (
            <div className="card p-5">
              <p className="eyebrow">Webisódios relacionados</p>
              <ul className="mt-3 space-y-1">
                {children.map((c) => (
                  <li key={c.id}>
                    <Link to={`/biblioteca/${c.id}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-text hover:bg-surface-2">
                      <SeriesGlyph seriesId={c.id} className="size-4" />
                      <span className="flex-1 truncate">{c.shortTitle}</span>
                      <span className="text-xs text-faint">{c.years}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parent && (
            <Link to={`/biblioteca/${parent.id}`} className="card flex items-center gap-3 p-5 hover:border-line-strong">
              <SeriesGlyph seriesId={parent.id} />
              <span className="text-sm">
                <span className="block text-xs text-muted">Vinculado a</span>
                <span className="font-semibold text-text">{parent.title}</span>
              </span>
            </Link>
          )}
          {sources.length > 0 && (
            <div className="px-1 text-xs text-faint">
              <p className="mb-1.5 font-semibold text-muted">Fontes</p>
              {sources.map((src) => (
                <a key={src.id} href={src.url} target="_blank" rel="noreferrer" className="block truncate py-0.5 hover:text-text">
                  {src.label}
                </a>
              ))}
            </div>
          )}
        </aside>
      </Container>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title ?? ''}
        description={
          confirm
            ? confirm.undo
              ? `${plural(confirm.ids.length, 'item volta', 'itens voltam')} a ficar pendente. Favoritos e notas são mantidos.`
              : `${plural(confirm.ids.length, 'item será marcado', 'itens serão marcados')} como concluído. Você poderá desfazer logo em seguida.`
            : ''
        }
        confirmLabel={confirm?.undo ? 'Desmarcar' : 'Marcar como assistida'}
        destructive={confirm?.undo}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.undo) void actions.uncomplete(confirm.ids, `${confirm.label}: desmarcada`);
          else void actions.complete(confirm.ids, `${confirm.label}: concluída`);
          setConfirm(null);
        }}
      />
    </div>
  );
}

function SeasonSection({
  series,
  season,
  journey,
  filter,
  selected,
  onSelect,
  onMarkSeason,
}: {
  series: Series;
  season: Season;
  journey: Journey;
  filter: Filter;
  selected?: Set<string>;
  onSelect?: (id: string) => void;
  onMarkSeason: (pending: string[], allDone: boolean) => void;
}) {
  const s = summarize(season.episodeIds, journey.progress);
  const visible = useMemo(
    () =>
      season.episodeIds.filter((id) => {
        const p = journey.progress.get(id);
        if (filter === 'pending') return p?.status !== 'completed';
        if (filter === 'done') return p?.status === 'completed';
        if (filter === 'fav') return !!p?.favorite;
        return true;
      }),
    [season.episodeIds, journey.progress, filter],
  );
  const pending = season.episodeIds.filter((id) => journey.progress.get(id)?.status !== 'completed');
  const airYear = INDEX.episodes.get(season.episodeIds[0]!)?.airdate?.slice(0, 4);

  return (
    <section aria-labelledby={`season-${season.number}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={`season-${season.number}`} className="display text-2xl text-text">
            {season.label}
          </h2>
          <p className="text-xs text-muted tabular">
            {airYear} · {s.completed}/{s.total}
          </p>
        </div>
        {s.remaining === 0 ? <Chip color="var(--success)">Concluída</Chip> : null}
        {!onSelect && (
          <Button size="sm" variant="ghost" onClick={() => onMarkSeason(pending, s.remaining === 0)}>
            {s.remaining === 0 ? 'Desmarcar' : 'Marcar temporada'}
          </Button>
        )}
      </div>
      <ProgressBar value={s.ratio} size="sm" className="mb-3" color={s.ratio === 1 ? 'var(--success)' : series.accent} label={`Progresso: ${season.label}`} />
      {visible.length ? (
        <div className="flex flex-col gap-0.5">
          {visible.map((id) => (
            <EpisodeRow key={id} journey={journey} episodeId={id} selected={selected?.has(id)} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum episódio neste filtro" />
      )}
    </section>
  );
}
