import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Info } from 'lucide-react';
import { Container, PageHeader } from '@/components/Page';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { EpisodeTitle } from '@/components/EpisodeRow';
import { EmptyState, ProgressBar, ProgressRing, SectionTitle, Skeleton } from '@/components/ui';
import { INDEX, getEpisode, getSeries, useJourney, type Journey } from '@/state/journey';
import { summarize, sumRuntime } from '@/domain/engine';
import { episodeCode, formatInt, formatMinutes, formatMonth, formatPercent, relativeDay } from '@/lib/format';

export function StatsPage() {
  const journey = useJourney();
  return (
    <>
      <PageHeader title="Estatísticas" eyebrow="Sua jornada em números" />
      <Container>{journey ? <StatsView journey={journey} /> : <Skeleton className="h-96" />}</Container>
    </>
  );
}

function StatsView({ journey }: { journey: Journey }) {
  const { summary, order, progress } = journey;
  const done = order.filter((id) => progress.get(id)?.status === 'completed');
  const pending = order.filter((id) => progress.get(id)?.status !== 'completed');
  const slotDone = sumRuntime(INDEX, done, 'slotRuntime');
  const slotLeft = sumRuntime(INDEX, pending, 'slotRuntime');
  const realDone = sumRuntime(INDEX, done, 'runtimeMinutes');
  const realLeft = sumRuntime(INDEX, pending, 'runtimeMinutes');
  const unknownDone = done.filter((id) => {
    const e = getEpisode(id)!;
    return e.runtimeMinutes == null && e.slotRuntime == null;
  }).length;
  const unknownLeft = pending.filter((id) => {
    const e = getEpisode(id)!;
    return e.runtimeMinutes == null && e.slotRuntime == null;
  }).length;
  const favorites = [...progress.values()].filter((p) => p.favorite).length;

  return (
    <div className="space-y-12">
      <section className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="card flex items-center gap-6 p-6">
          <ProgressRing value={summary.ratio} size={136} stroke={8} label="Progresso global">
            <div className="text-center">
              <span className="block text-3xl font-semibold text-text tabular">{formatPercent(summary.ratio)}</span>
              <span className="text-xs text-muted">concluído</span>
            </div>
          </ProgressRing>
          <div className="space-y-3">
            <Stat label="Concluídos" value={formatInt(summary.completed)} />
            <Stat label="Restantes" value={formatInt(summary.remaining)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          <Tile
            label="Tempo de grade (TV)"
            value={slotDone.minutes + realDone.minutes ? `~${formatMinutes(slotDone.minutes + realDone.minutes)}` : '—'}
            hint="Faixa de TV + durações verificadas"
          />
          <Tile
            label="Grade restante"
            value={slotLeft.minutes + realLeft.minutes ? `~${formatMinutes(slotLeft.minutes + realLeft.minutes)}` : '—'}
            hint={unknownLeft ? `+ ${formatInt(unknownLeft)} sem duração conhecida` : 'Faixa de TV + durações verificadas'}
          />
          <Tile label="Favoritos" value={formatInt(favorites)} hint={journey.settings.orderMode === 'chronological' ? 'Modo cronológico' : 'Modo lançamento'} />
        </div>
      </section>

      <p className="-mt-8 flex items-start gap-2 text-xs leading-relaxed text-faint">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Os tempos usam a duração da faixa de exibição na TV informada pelo TVmaze (que inclui intervalos comerciais) e, para
          webisódios, apenas durações publicadas. Itens sem dado não entram na soma
          {unknownDone ? ` (${formatInt(unknownDone)} concluídos sem duração conhecida)` : ''}. Nada é estimado.
        </span>
      </p>

      <section aria-labelledby="by-series">
        <SectionTitle id="by-series" eyebrow="Produções" title="Progresso por série" />
        <ul className="card divide-y divide-line">
          {INDEX.catalog.series
            .filter((s) => s.kind === 'main' || journey.settings.includeExtras)
            .map((series) => {
              const ids = order.filter((id) => getEpisode(id)!.seriesId === series.id);
              if (!ids.length) return null;
              const s = summarize(ids, progress);
              return (
                <li key={series.id}>
                  <Link to={`/biblioteca/${series.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2">
                    <SeriesGlyph seriesId={series.id} className="size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium text-text">{series.shortTitle}</span>
                        <span className="shrink-0 text-xs text-muted tabular">
                          {s.completed}/{s.total} · {formatPercent(s.ratio)}
                        </span>
                      </div>
                      <ProgressBar value={s.ratio} size="sm" className="mt-2" color={s.ratio === 1 ? 'var(--success)' : undefined} label={`Progresso em ${series.title}`} />
                    </div>
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>

      {journey.settings.orderMode === 'chronological' && (
        <section aria-labelledby="by-phase">
          <SectionTitle id="by-phase" eyebrow="Cronologia" title="Progresso por fase" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {INDEX.catalog.phases.map((phase, i) => {
              const ids = order.filter((id) => INDEX.entryOf.get(id)?.phaseId === phase.id);
              const s = summarize(ids, progress);
              return (
                <li key={phase.id} className="card p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="display text-2xl text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-text">{phase.title}</span>
                    <span className="text-xs text-muted tabular">
                      {s.completed}/{s.total}
                    </span>
                  </div>
                  <ProgressBar value={s.ratio} size="sm" className="mt-3" color={s.ratio === 1 ? 'var(--success)' : undefined} label={`Progresso em ${phase.title}`} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <History journey={journey} />
      <Recent journey={journey} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="text-2xl font-semibold text-text tabular">{value}</p>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card flex flex-col justify-between p-5 last:col-span-2 xl:last:col-span-1">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-2xl font-semibold whitespace-nowrap text-text tabular">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/** Conclusões por mês (últimos 12 meses com atividade até hoje). Série única → uma cor. */
function History({ journey }: { journey: Journey }) {
  const [hover, setHover] = useState<number | null>(null);
  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of journey.progress.values()) {
      if (p.status !== 'completed' || !p.completedAt) continue;
      const d = new Date(p.completedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const now = new Date();
    const out: Array<{ key: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, count: counts.get(key) ?? 0 });
    }
    return out;
  }, [journey.progress]);
  const max = Math.max(1, ...months.map((m) => m.count));
  const total = months.reduce((a, m) => a + m.count, 0);

  return (
    <section aria-labelledby="history">
      <SectionTitle id="history" eyebrow="Histórico" title="Episódios concluídos por mês" />
      {total === 0 ? (
        <div className="card">
          <EmptyState title="Sem histórico ainda">As conclusões aparecem aqui, mês a mês, conforme você marca episódios.</EmptyState>
        </div>
      ) : (
        <div className="card p-5">
          <div className="relative flex h-44 items-end gap-1.5 border-b border-line sm:gap-3" onMouseLeave={() => setHover(null)}>
            {months.map((m, i) => (
              <button
                key={m.key}
                type="button"
                className="group relative flex h-full flex-1 items-end focus:outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${formatMonth(m.key)}: ${m.count} concluídos`}
              >
                <span
                  className="w-full rounded-t-[4px] transition-[height,opacity] duration-500 ease-out-soft"
                  style={{
                    height: m.count ? `${Math.max(4, (m.count / max) * 100)}%` : '2px',
                    background: m.count ? 'var(--accent)' : 'var(--line-strong)',
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs whitespace-nowrap text-text shadow-xl">
                    <span className="font-semibold tabular">{m.count}</span> em {formatMonth(m.key)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 sm:gap-3" aria-hidden>
            {months.map((m, i) => (
              <span key={m.key} className="flex-1 truncate text-center text-[0.625rem] text-faint">
                {i % 2 === 0 || months.length < 8 ? formatMonth(m.key) : ''}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>Episódios concluídos por mês</caption>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <th scope="row">{formatMonth(m.key)}</th>
                  <td>{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Recent({ journey }: { journey: Journey }) {
  const recent = [...journey.progress.values()]
    .filter((p) => p.status === 'completed' && p.completedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);
  if (!recent.length) return null;
  return (
    <section aria-labelledby="recent">
      <SectionTitle id="recent" eyebrow="Recentes" title="Últimas conclusões" />
      <ul className="card divide-y divide-line">
        {recent.map((p) => {
          const ep = getEpisode(p.episodeId);
          if (!ep) return null;
          const series = getSeries(ep.seriesId)!;
          return (
            <li key={p.episodeId}>
              <Link to={`/episodio/${ep.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <SeriesGlyph seriesId={series.id} className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    {series.code} · {episodeCode(ep)}
                  </p>
                  <p className="truncate text-sm text-text">
                    <EpisodeTitle journey={journey} episodeId={ep.id} revealable={false} />
                  </p>
                </div>
                <span className="shrink-0 text-xs text-faint">{relativeDay(p.completedAt!)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
