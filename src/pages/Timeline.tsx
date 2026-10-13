import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import { CheckCheck, ChevronDown, LocateFixed, Rows2, Rows3 } from 'lucide-react';
import { Container, PageHeader } from '@/components/Page';
import { EpisodeRow } from '@/components/EpisodeRow';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { ConfirmDialog } from '@/components/dialogs';
import { ConfidenceBadge, IconButton, ProgressBar, Segmented, Skeleton } from '@/components/ui';
import { INDEX, actions, getEpisode, getSeries, useJourney, type Journey } from '@/state/journey';
import { useUI } from '@/state/ui';
import { summarize } from '@/domain/engine';
import type { Confidence } from '@/domain/types';
import { plural } from '@/lib/format';

type Row =
  | { type: 'group'; key: string; n: number; title: string; era: string; summary?: string; confidence?: Confidence; ids: string[] }
  | { type: 'block'; key: string; seriesId: string; season: number; label: string; note?: string; confidence?: Confidence; ids: string[] }
  | { type: 'episode'; key: string; id: string };

interface Group {
  key: string;
  title: string;
  era: string;
  summary?: string;
  confidence?: Confidence;
  blocks: Array<Omit<Extract<Row, { type: 'block' }>, 'type'>>;
}

function blockLabel(seriesId: string, season: number, ids: string[]) {
  const series = getSeries(seriesId)!;
  const first = getEpisode(ids[0]!)!;
  const last = getEpisode(ids.at(-1)!)!;
  const seasonSize = INDEX.catalog.seasons.find((s) => s.seriesId === seriesId && s.number === season)?.episodeIds.length ?? 0;
  if (series.kind === 'extra') return ids.length === seasonSize ? `${ids.length} partes` : `Partes ${first.number}–${last.number}`;
  const prefix = seriesId === 'tales' || seriesId === 'towl' ? 'Temporada única' : `Temporada ${season}`;
  if (ids.length === seasonSize) return prefix;
  return ids.length === 1 ? `${prefix} · episódio ${first.number}` : `${prefix} · episódios ${first.number}–${last.number}`;
}

/** Agrupa a ordem atual: fases (cronológica) ou anos de lançamento. */
function buildGroups(journey: Journey): Group[] {
  const groups: Group[] = [];
  const chrono = journey.settings.orderMode === 'chronological';
  let group: Group | undefined;
  let block: Group['blocks'][number] | undefined;

  for (const id of journey.order) {
    const ep = getEpisode(id)!;
    const entry = INDEX.entryOf.get(id);
    const gKey = chrono ? (entry?.phaseId ?? 'unplaced') : (ep.airdate?.slice(0, 4) ?? 'sem-data');
    if (!group || group.key !== gKey) {
      const phase = chrono ? INDEX.phases.get(gKey) : undefined;
      group = {
        key: gKey,
        title: phase?.title ?? gKey,
        era: phase?.era ?? 'Ano de lançamento',
        summary: phase?.summary,
        confidence: phase?.confidence,
        blocks: [],
      };
      groups.push(group);
      block = undefined;
    }
    const bKey = chrono ? (entry?.id ?? `${ep.seriesId}-${ep.season}`) : `${gKey}-${ep.seriesId}-${ep.season}`;
    if (!block || block.key !== bKey) {
      block = {
        key: bKey,
        seriesId: ep.seriesId,
        season: ep.season,
        label: '',
        note: chrono ? entry?.note : undefined,
        confidence: chrono ? entry?.confidence : undefined,
        ids: [],
      };
      group.blocks.push(block);
    }
    block.ids.push(id);
  }
  for (const g of groups) for (const b of g.blocks) b.label = blockLabel(b.seriesId, b.season, b.ids);
  return groups;
}

export function TimelinePage() {
  const journey = useJourney();
  if (!journey) {
    return (
      <>
        <PageHeader title="Linha do tempo" eyebrow="Cronologia" />
        <Container className="space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </Container>
      </>
    );
  }
  return <TimelineView journey={journey} />;
}

function TimelineView({ journey }: { journey: Journey }) {
  const collapsed = useUI((s) => s.collapsed);
  const togglePhase = useUI((s) => s.togglePhase);
  const setCollapsed = useUI((s) => s.setCollapsed);
  const density = journey.settings.timelineDensity;
  const chrono = journey.settings.orderMode === 'chronological';
  const groups = useMemo(() => buildGroups(journey), [journey]);
  const [confirm, setConfirm] = useState<{ ids: string[]; label: string } | null>(null);

  const rows = useMemo(() => {
    const out: Row[] = [];
    groups.forEach((g, gi) => {
      const ids = g.blocks.flatMap((b) => b.ids);
      out.push({ type: 'group', key: `g-${g.key}`, n: gi + 1, title: g.title, era: g.era, summary: g.summary, confidence: g.confidence, ids });
      if (collapsed.includes(g.key)) return;
      for (const b of g.blocks) {
        out.push({ type: 'block', ...b, key: `b-${b.key}` });
        for (const id of b.ids) out.push({ type: 'episode', key: id, id });
      }
    });
    return out;
  }, [groups, collapsed]);

  const listRef = useRef<HTMLDivElement>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setMargin(el.getBoundingClientRect().top + window.scrollY);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => {
      const r = rows[i]!;
      if (r.type === 'group') return r.summary ? 196 : 132;
      if (r.type === 'block') return r.note ? 112 : 84;
      return density === 'compact' ? 50 : 68;
    },
    overscan: 10,
    scrollMargin: margin,
    getItemKey: (i) => rows[i]!.key,
  });

  const nextIndex = useMemo(() => rows.findIndex((r) => r.type === 'episode' && r.id === journey.nextUp), [rows, journey.nextUp]);
  const nextGroupKey = journey.nextUp ? groups.find((g) => g.blocks.some((b) => b.ids.includes(journey.nextUp!)))?.key : undefined;

  const goToCurrent = useCallback(() => {
    if (nextGroupKey && collapsed.includes(nextGroupKey)) {
      setCollapsed(collapsed.filter((k) => k !== nextGroupKey));
      requestAnimationFrame(() => requestAnimationFrame(() => document.dispatchEvent(new Event('afterfall:go-current'))));
      return;
    }
    if (nextIndex >= 0) virtualizer.scrollToIndex(nextIndex, { align: 'center' });
  }, [nextGroupKey, collapsed, setCollapsed, nextIndex, virtualizer]);

  useEffect(() => {
    const on = () => {
      if (nextIndex >= 0) virtualizer.scrollToIndex(nextIndex, { align: 'center' });
    };
    document.addEventListener('afterfall:go-current', on);
    return () => document.removeEventListener('afterfall:go-current', on);
  }, [nextIndex, virtualizer]);

  // Rolagem inicial: âncora de fase (#fase-x) ou posição atual.
  const location = useLocation();
  const didInitial = useRef(false);
  useEffect(() => {
    if (didInitial.current || margin === 0) return;
    didInitial.current = true;
    const hash = decodeURIComponent(location.hash.replace('#fase-', ''));
    if (hash) {
      const i = rows.findIndex((r) => r.type === 'group' && r.key === `g-${hash}`);
      if (i >= 0) {
        if (collapsed.includes(hash)) setCollapsed(collapsed.filter((k) => k !== hash));
        requestAnimationFrame(() => virtualizer.scrollToIndex(i, { align: 'start' }));
        return;
      }
    }
    if (nextIndex > 3) requestAnimationFrame(() => virtualizer.scrollToIndex(nextIndex, { align: 'center' }));
  }, [margin, location.hash, rows, nextIndex, virtualizer, collapsed, setCollapsed]);

  // Mostrar o botão "posição atual" quando ela está fora da tela.
  const items = virtualizer.getVirtualItems();
  const currentVisible =
    nextIndex >= 0 && items.some((it) => it.index === nextIndex) && (() => {
      const it = items.find((x) => x.index === nextIndex)!;
      const top = it.start - virtualizer.options.scrollMargin - (window.scrollY - margin);
      return top > 40 && top < window.innerHeight - 140;
    })();

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.includes(g.key));

  return (
    <>
      <PageHeader
        title="Linha do tempo"
        eyebrow={chrono ? 'Ordem cronológica' : 'Ordem de lançamento'}
        description={
          chrono
            ? 'Do primeiro dia do surto às continuações. Cada bloco indica o grau de certeza da posição.'
            : 'Na ordem em que tudo foi exibido, agrupado por ano.'
        }
      />
      <Container>
        <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl safe-top sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-b-2xl lg:px-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Segmented
              label="Ordem"
              value={journey.settings.orderMode}
              onChange={(v) => void actions.settings({ orderMode: v })}
              options={[
                { value: 'chronological', label: 'Cronológica' },
                { value: 'release', label: 'Lançamento' },
              ]}
              className="w-full sm:w-80"
            />
            <IconButton
              label={density === 'compact' ? 'Visão detalhada' : 'Visão compacta'}
              onClick={() => void actions.settings({ timelineDensity: density === 'compact' ? 'detailed' : 'compact' })}
            >
              {density === 'compact' ? <Rows3 className="size-5" /> : <Rows2 className="size-5" />}
            </IconButton>
            <button
              type="button"
              className="h-11 rounded-full px-3 text-[0.8125rem] font-semibold text-muted hover:bg-surface-2 hover:text-text"
              onClick={() => setCollapsed(allCollapsed ? [] : groups.map((g) => g.key))}
            >
              {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
            </button>
            <label className="ml-auto flex h-11 cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-muted">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={journey.settings.includeExtras}
                onChange={(e) => void actions.settings({ includeExtras: e.target.checked })}
              />
              Extras
            </label>
          </div>
        </div>

        <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => {
            const row = rows[item.index]!;
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
              >
                {row.type === 'group' && (
                  <GroupHeader
                    row={row}
                    journey={journey}
                    collapsed={collapsed.includes(row.key.slice(2))}
                    current={row.key.slice(2) === nextGroupKey}
                    onToggle={() => togglePhase(row.key.slice(2))}
                  />
                )}
                {row.type === 'block' && <BlockHeader row={row} journey={journey} onMarkAll={(ids, label) => setConfirm({ ids, label })} />}
                {row.type === 'episode' && (
                  <div className="relative pl-5 sm:pl-7">
                    <span className="absolute left-[0.6rem] top-0 bottom-0 w-px bg-line sm:left-[0.95rem]" aria-hidden />
                    <EpisodeRow journey={journey} episodeId={row.id} density={density} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>

      <AnimatePresence>
        {journey.nextUp && !currentVisible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={goToCurrent}
            className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface-2/95 px-4 text-sm font-semibold text-text shadow-2xl backdrop-blur-xl lg:bottom-8 lg:right-8"
          >
            <LocateFixed className="size-4 text-accent-ink" aria-hidden /> Posição atual
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Marcar bloco como assistido?"
        description={confirm ? `${plural(confirm.ids.length, 'item', 'itens')} de ${confirm.label} serão marcados como concluídos. Você poderá desfazer em seguida.` : ''}
        confirmLabel="Marcar como assistido"
        onConfirm={() => {
          if (confirm) void actions.complete(confirm.ids, `${confirm.label}: concluído`);
          setConfirm(null);
        }}
      />
    </>
  );
}

function GroupHeader({
  row,
  journey,
  collapsed,
  current,
  onToggle,
}: {
  row: Extract<Row, { type: 'group' }>;
  journey: Journey;
  collapsed: boolean;
  current: boolean;
  onToggle: () => void;
}) {
  const s = summarize(row.ids, journey.progress);
  const id = row.key.slice(2);
  return (
    <section id={`fase-${id}`} className="pt-8 pb-3 first:pt-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group flex w-full items-start gap-4 rounded-2xl text-left"
      >
        <span className={clsx('display w-10 shrink-0 text-5xl leading-none sm:w-14 sm:text-6xl', current ? 'text-accent-ink' : 'text-faint/70')}>
          {String(row.n).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="eyebrow">{row.era}</span>
            {row.confidence && <ConfidenceBadge level={row.confidence} />}
            {current && <span className="text-[0.6875rem] font-semibold tracking-wide text-accent-ink uppercase">Você está aqui</span>}
          </span>
          <span className="display mt-1 block text-3xl text-text sm:text-4xl">{row.title}</span>
          {row.summary && !collapsed && <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-muted">{row.summary}</span>}
          <span className="mt-3 flex items-center gap-3">
            <ProgressBar value={s.ratio} className="max-w-xs" color={s.ratio === 1 ? 'var(--success)' : undefined} label={`Progresso: ${row.title}`} />
            <span className="shrink-0 text-xs text-faint tabular">
              {s.completed}/{s.total}
            </span>
          </span>
        </span>
        <ChevronDown
          className={clsx('mt-2 size-5 shrink-0 text-faint transition-transform duration-300', collapsed && '-rotate-90')}
          aria-hidden
        />
      </button>
    </section>
  );
}

function BlockHeader({
  row,
  journey,
  onMarkAll,
}: {
  row: Extract<Row, { type: 'block' }>;
  journey: Journey;
  onMarkAll: (ids: string[], label: string) => void;
}) {
  const series = getSeries(row.seriesId)!;
  const s = summarize(row.ids, journey.progress);
  const done = s.remaining === 0;
  const pending = row.ids.filter((id) => journey.progress.get(id)?.status !== 'completed');
  const label = `${series.shortTitle} — ${row.label}`;
  return (
    <div className="relative mt-3 flex items-start gap-3 pl-5 sm:pl-7">
      <span
        className="absolute left-[0.3rem] top-3 size-3 rounded-full ring-4 ring-bg sm:left-[0.65rem]"
        style={{ background: done ? 'var(--success)' : series.accent }}
        aria-hidden
      />
      <span className="absolute left-[0.6rem] top-6 bottom-0 w-px bg-line sm:left-[0.95rem]" aria-hidden />
      <div
        className="min-w-0 flex-1 rounded-2xl border border-line py-3 pr-2 pl-4"
        style={{ background: `linear-gradient(100deg, color-mix(in srgb, ${series.accent} 13%, transparent), transparent 70%)` }}
      >
        <div className="flex items-center gap-3">
          <SeriesGlyph seriesId={series.id} className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold text-text">
              {series.shortTitle}
              {series.kind === 'extra' && <span className="ml-2 text-xs font-medium text-faint">webisódio</span>}
            </p>
            <p className="text-xs text-muted tabular">
              {row.label} · {s.completed}/{s.total}
            </p>
          </div>
          {row.confidence && <span className="hidden sm:block"><ConfidenceBadge level={row.confidence} compact /></span>}
          {!done && (
            <IconButton label={`Marcar ${label} como assistido`} onClick={() => (pending.length === 1 ? void actions.complete(pending) : onMarkAll(pending, label))}>
              <CheckCheck className="size-[1.1rem]" />
            </IconButton>
          )}
        </div>
        {row.note && <p className="mt-2 pr-2 text-[0.8125rem] leading-relaxed text-muted">{row.note}</p>}
      </div>
    </div>
  );
}
