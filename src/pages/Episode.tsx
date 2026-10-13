import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleDashed, Clock, ExternalLink, Heart, Info, ShieldCheck, Tv, Undo2 } from 'lucide-react';
import { Container } from '@/components/Page';
import { SeriesArt } from '@/components/SeriesArt';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { EpisodeTitle } from '@/components/EpisodeRow';
import { Button, ConfidenceBadge, IconButton, Skeleton } from '@/components/ui';
import { confidenceHint } from '@/components/styles';
import { INDEX, actions, getEpisode, getSeries, statusOf, useJourney, type Journey } from '@/state/journey';
import { db } from '@/data/db';
import { setNote } from '@/data/progressRepo';
import { getNeighbors } from '@/domain/engine';
import { AVAILABILITY } from '@/content/availability';
import { episodeCode, formatAirdate, formatInt, relativeDay } from '@/lib/format';
import { NotFoundPage } from './NotFound';
import type { Episode } from '@/domain/types';

export function EpisodePage() {
  const { episodeId = '' } = useParams();
  const ep = getEpisode(episodeId);
  const journey = useJourney();
  if (!ep) return <NotFoundPage />;
  return <EpisodeView ep={ep} journey={journey} />;
}

function EpisodeView({ ep, journey }: { ep: Episode; journey: Journey | undefined }) {
  const series = getSeries(ep.seriesId)!;
  const entry = INDEX.entryOf.get(ep.id);
  const phase = entry ? INDEX.phases.get(entry.phaseId) : undefined;
  const p = journey?.progress.get(ep.id);
  const status = statusOf(journey?.progress, ep.id);
  const nb = journey ? getNeighbors(journey.order, ep.id) : null;
  const sources = ep.sourceIds.map((id) => INDEX.catalog.sources.find((s) => s.id === id)).filter((s) => !!s);
  const availability = AVAILABILITY.filter((a) => a.seriesId === (series.parentId ?? series.id));
  const hidden = journey ? !journey.order.includes(ep.id) : false;

  return (
    <article>
      <SeriesArt seriesId={series.id} className="min-h-[21rem] sm:min-h-[24rem]" intensity={0.95}>
        <Container className="flex min-h-[21rem] flex-col justify-end pb-8 safe-top sm:min-h-[24rem]">
          <Link
            to={`/biblioteca/${series.id}`}
            className="mt-4 mb-auto inline-flex w-fit items-center gap-2 rounded-full bg-bg/40 px-3 py-1.5 text-sm font-medium text-text/90 backdrop-blur-md hover:text-text lg:mt-8"
          >
            <SeriesGlyph seriesId={series.id} className="size-4" />
            {series.title}
          </Link>
          <p className="eyebrow !text-text/75">
            {ep.kind === 'extra' ? 'Webisódio' : INDEX.catalog.seasons.find((s) => s.seriesId === ep.seriesId && s.number === ep.season)?.label}
          </p>
          <h1 className="mt-2">
            <span className="display block text-6xl text-text sm:text-7xl">{episodeCode(ep)}</span>
            <span className="mt-2 block text-2xl font-medium text-text sm:text-3xl">
              <EpisodeTitle journey={journey} episodeId={ep.id} />
            </span>
          </h1>
        </Container>
      </SeriesArt>

      <Container className="mt-6">
        {!journey ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
            <div className="min-w-0 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {status === 'completed' ? (
                  <Button variant="secondary" size="lg" icon={<Undo2 className="size-4" />} onClick={() => void actions.uncomplete([ep.id])}>
                    Marcar como não assistido
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" icon={<Check className="size-4" />} onClick={() => void actions.complete([ep.id])}>
                    Marcar como assistido
                  </Button>
                )}
                {status === 'unwatched' && (
                  <Button size="lg" variant="ghost" icon={<CircleDashed className="size-4" />} onClick={() => void actions.start(ep.id)}>
                    Estou assistindo
                  </Button>
                )}
                <IconButton label={p?.favorite ? 'Remover dos favoritos' : 'Favoritar'} active={p?.favorite} onClick={() => void actions.favorite(ep.id, p)}>
                  <Heart className={clsx('size-5', p?.favorite && 'fill-current')} />
                </IconButton>
              </div>
              {status === 'completed' && p?.completedAt && (
                <p className="-mt-3 text-sm text-success-ink">Concluído {relativeDay(p.completedAt)}.</p>
              )}
              {status === 'in_progress' && <p className="-mt-3 text-sm text-warning">Em andamento — este episódio fica em destaque no início.</p>}
              {hidden && (
                <p className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
                  <Info className="mt-0.5 size-4 shrink-0" /> Este é um conteúdo extra e os extras estão ocultos da sua jornada. Você ainda pode marcá-lo.
                </p>
              )}

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                <Fact icon={<CalendarDays className="size-4" />} label="Exibição original" value={formatAirdate(ep.airdate)} />
                <Fact
                  icon={<Clock className="size-4" />}
                  label={ep.runtimeMinutes ? 'Duração' : 'Faixa na TV'}
                  value={ep.runtimeMinutes ? `${ep.runtimeMinutes.toLocaleString('pt-BR')} min` : ep.slotRuntime ? `${ep.slotRuntime} min` : 'Não verificada'}
                  hint={!ep.runtimeMinutes && ep.slotRuntime ? 'Duração da faixa de exibição (inclui intervalos), segundo o TVmaze.' : undefined}
                />
                <Fact
                  icon={<ShieldCheck className="size-4" />}
                  label="Na jornada"
                  value={nb?.position ? `#${formatInt(nb.position)} de ${formatInt(journey.order.length)}` : '—'}
                  className="col-span-2 sm:col-span-1"
                />
              </dl>

              {phase && entry && (
                <section className="card p-5">
                  <p className="eyebrow">Posição cronológica</p>
                  <p className="mt-2 text-lg font-semibold text-text">
                    {phase.title} <span className="font-normal text-muted">· {phase.era}</span>
                  </p>
                  <div className="mt-2">
                    <ConfidenceBadge level={entry.confidence} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{confidenceHint(entry.confidence)}</p>
                  {entry.note && <p className="mt-3 text-sm leading-relaxed text-text/85">{entry.note}</p>}
                </section>
              )}

              <section className="card p-5">
                <p className="eyebrow">Sinopse</p>
                {ep.synopsis ? (
                  <p className="mt-2 text-sm leading-relaxed text-text/90">{ep.synopsis}</p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Sem sinopse verificada e livre de spoilers para este episódio. Preferimos não exibir texto a arriscar revelações.
                  </p>
                )}
                {journey.settings.spoilerShield && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                    <ShieldCheck className="size-3.5" /> Proteção contra spoilers ativa
                  </p>
                )}
              </section>

              <NoteEditor key={ep.id} episodeId={ep.id} initial={p?.note ?? ''} />

              {nb && (
                <nav aria-label="Navegação da jornada" className="grid grid-cols-2 gap-3">
                  <NeighborLink id={nb.prev} journey={journey} dir="prev" />
                  <NeighborLink id={nb.next} journey={journey} dir="next" />
                </nav>
              )}
            </div>

            <aside className="space-y-4">
              {availability.length > 0 && (
                <div className="card p-5">
                  <p className="eyebrow flex items-center gap-1.5">
                    <Tv className="size-3.5" aria-hidden /> Onde assistir
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {availability.map((a) => (
                      <li key={a.service + a.detail}>
                        <span className="font-semibold text-text">{a.service}</span>
                        {a.detail && <span className="text-muted"> — {a.detail}</span>}
                        <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-faint hover:text-text">
                          {a.sourceLabel}, {a.asOf} <ExternalLink className="size-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-faint">
                    {series.kind === 'extra' ? 'Referente à série-mãe; webisódios foram lançados na web. ' : ''}Reportado pela imprensa; confirme no serviço.
                  </p>
                </div>
              )}
              <div className="px-1 text-xs text-faint">
                <p className="mb-1.5 font-semibold text-muted">Fontes dos metadados</p>
                {sources.map((src) => (
                  <a key={src.id} href={src.url} target="_blank" rel="noreferrer" className="block truncate py-0.5 hover:text-text">
                    {src.label}
                  </a>
                ))}
              </div>
            </aside>
          </div>
        )}
      </Container>
    </article>
  );
}

function Fact({ icon, label, value, hint, className }: { icon: ReactNode; label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={clsx('bg-surface p-4', className)} title={hint}>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-[0.9375rem] font-semibold text-text tabular">{value}</dd>
      {hint && <dd className="mt-1 text-[0.6875rem] leading-snug text-faint">Inclui intervalos (TVmaze)</dd>}
    </div>
  );
}

function NeighborLink({ id, journey, dir }: { id: string | null; journey: Journey; dir: 'prev' | 'next' }) {
  if (!id) return <div />;
  const ep = getEpisode(id)!;
  const series = getSeries(ep.seriesId)!;
  return (
    <Link
      to={`/episodio/${id}`}
      className={clsx('card group flex min-w-0 flex-col p-4 transition-colors hover:border-line-strong', dir === 'next' && 'items-end text-right')}
    >
      <span className="flex items-center gap-1 text-xs text-muted">
        {dir === 'prev' ? (
          <>
            <ArrowLeft className="size-3.5" /> Anterior
          </>
        ) : (
          <>
            Seguinte <ArrowRight className="size-3.5" />
          </>
        )}
      </span>
      <span className="mt-1 text-xs font-semibold text-text/80">
        {series.code} · {episodeCode(ep)}
      </span>
      <span className="mt-0.5 block w-full truncate text-sm text-text">
        <EpisodeTitle journey={journey} episodeId={id} revealable={false} />
      </span>
    </Link>
  );
}

function NoteEditor({ episodeId, initial }: { episodeId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(value);

  useEffect(
    () => () => {
      // salva ao sair da tela se houver alteração pendente
      if (timer.current) {
        clearTimeout(timer.current);
        void setNote(db, episodeId, latest.current);
      }
    },
    [episodeId],
  );

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <label htmlFor="note" className="eyebrow">
          Notas pessoais
        </label>
        <span className="text-xs text-faint" aria-live="polite">
          {saved === 'saving' ? 'Salvando…' : saved === 'saved' ? 'Salvo neste aparelho' : ''}
        </span>
      </div>
      <textarea
        id="note"
        value={value}
        maxLength={2000}
        rows={3}
        placeholder="O que você achou? Algo para lembrar?"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          latest.current = v;
          setSaved('saving');
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            timer.current = undefined;
            void setNote(db, episodeId, v).then(() => setSaved('saved'));
          }, 500);
        }}
        className="mt-3 w-full resize-y rounded-xl border border-line bg-surface-2 p-3 text-[0.9375rem] text-text placeholder:text-faint focus:border-line-strong focus:outline-none"
      />
    </section>
  );
}
