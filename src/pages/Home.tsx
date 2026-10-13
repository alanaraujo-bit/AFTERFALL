import { Link, useNavigate, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Clock, Flag, History, Play, Waypoints } from 'lucide-react';
import { Container } from '@/components/Page';
import { Wordmark } from '@/components/brand';
import { SeriesArt } from '@/components/SeriesArt';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { EpisodeRow, EpisodeTitle } from '@/components/EpisodeRow';
import { Button, ConfidenceBadge, ProgressBar, ProgressRing, SectionTitle, Skeleton } from '@/components/ui';
import { buttonStyles } from '@/components/styles';
import { INDEX, actions, getEpisode, getSeries, useJourney, type Journey } from '@/state/journey';
import { getTransition, summarize, sumRuntime } from '@/domain/engine';
import { episodeCode, formatAirdate, formatInt, formatMinutes, formatPercent, greeting, plural, relativeDay } from '@/lib/format';

export function HomePage() {
  const journey = useJourney();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Atalho do PWA "Continuar jornada"
  useEffect(() => {
    if (params.get('continuar') && journey?.nextUp) {
      setParams({}, { replace: true });
      navigate(`/episodio/${journey.nextUp}`);
    }
  }, [params, journey?.nextUp, navigate, setParams]);

  if (!journey) return <HomeSkeleton />;
  const chrono = journey.settings.orderMode === 'chronological';
  return (
    <div className="safe-top">
      <Container wide className="pt-4 lg:pt-10">
        <Greeting journey={journey} />
      </Container>
      <Container wide className="mt-4">
        <Hero journey={journey} />
      </Container>
      <Container wide className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ProgressCard journey={journey} />
        <MilestoneCard journey={journey} />
        <LastWatchedCard journey={journey} />
      </Container>
      <Container wide className={chrono ? "mt-10 grid gap-10 xl:grid-cols-[1.4fr_1fr]" : "mt-10"}>
        <UpNext journey={journey} />
        {chrono && <PhaseMap journey={journey} />}
      </Container>
    </div>
  );
}

function Greeting({ journey }: { journey: Journey }) {
  const last = journey.lastWatched ? journey.progress.get(journey.lastWatched) : undefined;
  const today = last?.completedAt && relativeDay(last.completedAt) === 'hoje';
  const line =
    journey.summary.completed === 0
      ? 'O mundo acabou. Sua jornada começa aqui.'
      : journey.nextUp === null
        ? 'Você atravessou o fim do mundo inteiro.'
        : today
          ? 'Mais um episódio hoje?'
          : 'O mundo acabou. Sua jornada continua.';
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-3 lg:hidden">
          <Wordmark size="sm" />
        </div>
        <p className="text-sm text-muted">{greeting()}.</p>
        <p className="font-serif text-xl text-text italic sm:text-2xl">{line}</p>
      </div>
    </div>
  );
}

function Hero({ journey }: { journey: Journey }) {
  const next = journey.nextUp ? getEpisode(journey.nextUp) : undefined;
  if (!next) return <CompletedHero journey={journey} />;
  const series = getSeries(next.seriesId)!;
  const entry = INDEX.entryOf.get(next.id);
  const phase = entry ? INDEX.phases.get(entry.phaseId) : undefined;
  const transition = getTransition(INDEX, journey.order, next.id);
  const fromSeries = transition ? getSeries(transition.fromSeriesId) : undefined;
  const position = journey.position.get(next.id) ?? 0;

  return (
    <section aria-labelledby={`hero-title-${next.id}`} data-next={next.id} className="relative overflow-hidden rounded-[1.75rem] border border-line">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={next.id}
          data-hero-id={next.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <SeriesArt seriesId={series.id} className="min-h-[27rem] sm:min-h-[30rem] lg:min-h-[32rem]">
            <div className="flex h-full min-h-[27rem] flex-col justify-end p-5 sm:min-h-[30rem] sm:p-8 lg:min-h-[32rem] lg:p-12">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="eyebrow !text-text/80">Próximo na jornada</span>
                {phase && (
                  <span className="text-xs text-muted">
                    {phase.title} · {phase.era}
                  </span>
                )}
              </div>
              <Link
                to={`/biblioteca/${series.id}`}
                className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-text/90 hover:text-text"
              >
                <SeriesGlyph seriesId={series.id} className="size-4" />
                {series.title}
              </Link>
              <h1 id={`hero-title-${next.id}`} className="mt-2">
                <span className="display block text-[3.5rem] text-text sm:text-7xl lg:text-8xl">{episodeCode(next)}</span>
                <span className="mt-2 block max-w-2xl text-xl font-medium text-text sm:text-2xl">
                  <EpisodeTitle journey={journey} episodeId={next.id} />
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted tabular">
                {next.kind === 'extra' ? 'Webisódio · ' : ''}
                {formatAirdate(next.airdate)} · #{formatInt(position)} de {formatInt(journey.order.length)} na{' '}
                {journey.settings.orderMode === 'chronological' ? 'cronologia' : 'ordem de lançamento'}
              </p>

              {transition && fromSeries && (
                <p className="mt-4 max-w-xl rounded-2xl border border-line bg-bg/55 px-4 py-3 text-[0.8125rem] leading-relaxed text-muted backdrop-blur-md">
                  <span className="font-semibold text-text">Mudança de produção.</span> Você sai de {fromSeries.shortTitle} e
                  entra em {series.shortTitle}
                  {entry?.note ? ` — ${entry.note}` : '.'}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link to={`/episodio/${next.id}`} className={buttonStyles('primary', 'lg')}>
                  <Play className="size-4 fill-current" aria-hidden />
                  Continuar jornada
                </Link>
                <Button
                  size="lg"
                  className="!bg-bg/50 backdrop-blur-md"
                  icon={<Check className="size-4" />}
                  onClick={() => void actions.complete([next.id], `${series.code} ${episodeCode(next)} concluído`)}
                >
                  Já assisti
                </Button>
              </div>
              {journey.skipped > 0 && (
                <Link to="/linha-do-tempo" className="mt-4 w-fit text-xs text-muted underline-offset-4 hover:text-text hover:underline">
                  {plural(journey.skipped, 'episódio ficou', 'episódios ficaram')} para trás na ordem — ver na timeline
                </Link>
              )}
            </div>
          </SeriesArt>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function CompletedHero({ journey }: { journey: Journey }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-line">
      <SeriesArt seriesId="dc" className="min-h-[24rem]">
        <div className="flex min-h-[24rem] flex-col justify-end p-6 sm:p-10">
          <p className="eyebrow">Fim da linha — por enquanto</p>
          <h1 className="display mt-3 text-6xl text-text sm:text-7xl">Jornada concluída</h1>
          <p className="mt-3 max-w-lg text-muted">
            Você concluiu os {formatInt(journey.summary.total)} itens da sua jornada. Quando novos episódios forem exibidos, eles
            aparecerão aqui após uma atualização do app.
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/estatisticas" className={buttonStyles('primary')}>
              Ver estatísticas
            </Link>
          </div>
        </div>
      </SeriesArt>
    </section>
  );
}

function ProgressCard({ journey }: { journey: Journey }) {
  const watchedIds = journey.order.filter((id) => journey.progress.get(id)?.status === 'completed');
  const verified = sumRuntime(INDEX, watchedIds, 'runtimeMinutes');
  const slot = sumRuntime(INDEX, watchedIds, 'slotRuntime');
  return (
    <Link to="/estatisticas" className="card group flex items-center gap-5 p-5 transition-colors hover:border-line-strong">
      <ProgressRing value={journey.summary.ratio} size={92} stroke={6} label="Progresso global">
        <span className="text-lg font-semibold text-text tabular">{formatPercent(journey.summary.ratio)}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Progresso global</p>
        <p className="mt-1.5 text-2xl font-semibold text-text tabular">
          {formatInt(journey.summary.completed)}
          <span className="text-base font-normal text-faint"> / {formatInt(journey.summary.total)}</span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden />
          {slot.minutes + verified.minutes > 0
            ? `~${formatMinutes(slot.minutes + verified.minutes)} de grade na TV`
            : `${formatInt(journey.summary.remaining)} restantes`}
        </p>
      </div>
      <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** No modo lançamento, o marco é a próxima troca de produção (fases cronológicas não se aplicam). */
function NextProductionCard({ journey }: { journey: Journey }) {
  const start = journey.nextUp ? journey.order.indexOf(journey.nextUp) : -1;
  const current = journey.nextUp ? getEpisode(journey.nextUp)?.seriesId : undefined;
  let found: { seriesId: string; distance: number } | null = null;
  for (let i = start + 1; start >= 0 && i < journey.order.length; i++) {
    const sid = getEpisode(journey.order[i]!)!.seriesId;
    if (sid !== current) {
      found = { seriesId: sid, distance: i - start };
      break;
    }
  }
  const series = found ? getSeries(found.seriesId) : undefined;
  return (
    <Link to="/linha-do-tempo" className="card group flex flex-col p-5 transition-colors hover:border-line-strong">
      <p className="eyebrow flex items-center gap-1.5">
        <Flag className="size-3.5" aria-hidden /> Próxima produção
      </p>
      {found && series ? (
        <>
          <p className="display mt-3 truncate text-3xl text-text">{series.shortTitle}</p>
          <p className="mt-1 text-sm text-muted">em {plural(found.distance, 'item', 'itens')} · ordem de lançamento</p>
        </>
      ) : (
        <>
          <p className="display mt-3 text-3xl text-text">Reta final</p>
          <p className="mt-1 text-sm text-muted">Nenhuma outra produção depois desta na ordem de lançamento.</p>
        </>
      )}
    </Link>
  );
}

function MilestoneCard({ journey }: { journey: Journey }) {
  if (journey.settings.orderMode === 'release') return <NextProductionCard journey={journey} />;
  const m = journey.milestone;
  return (
    <Link to="/linha-do-tempo" className="card group flex flex-col p-5 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <Flag className="size-3.5" aria-hidden /> Próximo marco
        </p>
        {m && <ConfidenceBadge level={m.phase.confidence} compact />}
      </div>
      {m ? (
        <>
          <p className="display mt-3 text-3xl text-text">{m.phase.title}</p>
          <p className="mt-1 text-sm text-muted">
            {m.phase.era} · em {plural(m.distance, 'item', 'itens')}
          </p>
        </>
      ) : (
        <>
          <p className="display mt-3 text-3xl text-text">Última fase</p>
          <p className="mt-1 text-sm text-muted">Você já está na fase final da cronologia.</p>
        </>
      )}
    </Link>
  );
}

function LastWatchedCard({ journey }: { journey: Journey }) {
  const last = journey.lastWatched ? getEpisode(journey.lastWatched) : undefined;
  const p = last ? journey.progress.get(last.id) : undefined;
  return (
    <div className="card flex flex-col p-5 md:col-span-2 xl:col-span-1">
      <p className="eyebrow flex items-center gap-1.5">
        <History className="size-3.5" aria-hidden /> Último assistido
      </p>
      {last ? (
        <Link to={`/episodio/${last.id}`} className="group mt-3 flex items-center gap-3">
          <SeriesArt seriesId={last.seriesId} className="size-14 shrink-0 rounded-xl" intensity={1.2} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">
              {getSeries(last.seriesId)?.shortTitle} · {episodeCode(last)}
            </p>
            <p className="truncate font-medium text-text">
              <EpisodeTitle journey={journey} episodeId={last.id} />
            </p>
            {p?.completedAt && <p className="text-xs text-faint">{relativeDay(p.completedAt)}</p>}
          </div>
          <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Nada ainda. Marque o primeiro episódio quando terminar — o AFTERFALL calcula o próximo automaticamente.
        </p>
      )}
    </div>
  );
}

function UpNext({ journey }: { journey: Journey }) {
  const rest = journey.queue.slice(1, 6);
  return (
    <section aria-labelledby="queue-title">
      <SectionTitle
        id="queue-title"
        eyebrow="Fila"
        title="Depois deste"
        action={
          <Link to="/linha-do-tempo" className="text-sm font-medium text-accent-ink hover:underline">
            Ver timeline
          </Link>
        }
      />
      {rest.length ? (
        <div className="flex flex-col gap-1">
          {rest.map((id) => (
            <EpisodeRow key={id} journey={journey} episodeId={id} showSeries />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nenhum outro item pendente na fila.</p>
      )}
    </section>
  );
}

function PhaseMap({ journey }: { journey: Journey }) {
  const currentPhase = journey.nextUp ? INDEX.entryOf.get(journey.nextUp)?.phaseId : undefined;
  return (
    <section aria-labelledby="phases-title">
      <SectionTitle id="phases-title" eyebrow="Cronologia" title="Fases do universo" />
      <ol className="card divide-y divide-line overflow-hidden">
        {INDEX.catalog.phases.map((phase, i) => {
          const ids = journey.order.filter((id) => INDEX.entryOf.get(id)?.phaseId === phase.id);
          const s = summarize(ids, journey.progress);
          const current = phase.id === currentPhase;
          return (
            <li key={phase.id}>
              <Link
                to={`/linha-do-tempo#fase-${phase.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2"
                aria-current={current ? 'step' : undefined}
              >
                <span className={`display w-6 text-2xl ${current ? 'text-accent-ink' : 'text-faint'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm font-semibold ${current ? 'text-text' : 'text-muted'}`}>
                      {phase.title}
                      {current && <span className="ml-2 text-xs font-medium text-accent-ink">você está aqui</span>}
                    </span>
                    <span className="shrink-0 text-xs text-faint tabular">
                      {s.completed}/{s.total}
                    </span>
                  </div>
                  <ProgressBar value={s.ratio} size="sm" className="mt-2" color={s.ratio === 1 ? 'var(--success)' : undefined} label={`Progresso em ${phase.title}`} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link to="/linha-do-tempo" className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <Waypoints className="size-4" /> Abrir a linha do tempo completa
      </Link>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <Container wide className="pt-6 lg:pt-10" aria-busy>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-7 w-72" />
      <Skeleton className="mt-6 h-[27rem] rounded-[1.75rem]" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </Container>
  );
}
