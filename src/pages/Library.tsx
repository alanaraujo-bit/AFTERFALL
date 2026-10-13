import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Container, PageHeader } from '@/components/Page';
import { SeriesArt } from '@/components/SeriesArt';
import { SeriesGlyph } from '@/components/SeriesGlyph';
import { EpisodeRow } from '@/components/EpisodeRow';
import { ProgressBar, SectionTitle, Skeleton } from '@/components/ui';
import { INDEX, getSeries, useJourney, useTitleGate, type Journey } from '@/state/journey';
import { summarize } from '@/domain/engine';
import { formatInt, formatPercent } from '@/lib/format';
import type { Series } from '@/domain/types';

export function LibraryPage() {
  const journey = useJourney();
  const [query, setQuery] = useState('');
  const main = INDEX.catalog.series.filter((s) => s.kind === 'main');
  const extras = INDEX.catalog.series.filter((s) => s.kind === 'extra');

  return (
    <>
      <PageHeader
        title="Biblioteca"
        eyebrow="O universo"
        description={`${main.length} produções e ${extras.length} séries de webisódios oficiais — ${formatInt(INDEX.catalog.episodes.length)} itens no total.`}
      />
      <Container>
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar episódio por título, série ou código (ex.: T5 E10)"
            aria-label="Buscar episódio"
            className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-[0.9375rem] text-text placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
        </div>
        {query.trim() ? (
          journey ? (
            <SearchResults journey={journey} query={query.trim()} />
          ) : (
            <Skeleton className="h-40" />
          )
        ) : (
          <>
            <SectionTitle eyebrow="Séries" title="Produções principais" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {main.map((s) => (
                <SeriesCard key={s.id} series={s} journey={journey} />
              ))}
            </div>
            <div className="mt-12">
              <SectionTitle eyebrow="Extras" title="Webisódios oficiais" />
              <p className="-mt-2 mb-5 max-w-2xl text-sm text-muted">
                Curtas lançados na web pela AMC. São opcionais: você pode incluí-los ou ocultá-los da jornada nos ajustes.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {extras.map((s) => (
                  <SeriesCard key={s.id} series={s} journey={journey} small />
                ))}
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}

function SeriesCard({ series, journey, small }: { series: Series; journey: Journey | undefined; small?: boolean }) {
  const ids = INDEX.catalog.episodes.filter((e) => e.seriesId === series.id).map((e) => e.id);
  const seasons = INDEX.catalog.seasons.filter((s) => s.seriesId === series.id).length;
  const s = journey ? summarize(ids, journey.progress) : null;
  const parent = series.parentId ? getSeries(series.parentId) : undefined;
  return (
    <Link
      to={`/biblioteca/${series.id}`}
      className="group card overflow-hidden transition-[transform,border-color] duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-line-strong active:scale-[0.99]"
    >
      <SeriesArt seriesId={series.id} className={small ? 'h-24' : 'h-40 sm:h-44'}>
        <div className="flex h-full items-end p-4">
          {!small && <span className="display text-3xl leading-[0.95] text-text drop-shadow-md">{series.shortTitle}</span>}
        </div>
      </SeriesArt>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <SeriesGlyph seriesId={series.id} className="size-4 shrink-0" />
          <p className="truncate text-sm font-semibold text-text">{small ? series.shortTitle : series.title}</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {series.years} · {series.kind === 'extra' ? `${ids.length} partes · ${parent?.shortTitle}` : `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'} · ${ids.length} ep.`}
        </p>
        {s && (
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={s.ratio} size="sm" color={s.ratio === 1 ? 'var(--success)' : series.accent} label={`Progresso em ${series.title}`} />
            <span className="shrink-0 text-xs text-faint tabular">{s.ratio === 1 ? 'Concluída' : formatPercent(s.ratio)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

const norm = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function SearchResults({ journey, query }: { journey: Journey; query: string }) {
  const gate = useTitleGate(journey);
  const results = useMemo(() => {
    const q = norm(query);
    const code = q.match(/t\s*(\d+)\s*[·.\- ]?\s*e\s*(\d+)/);
    return INDEX.catalog.episodes
      .filter((ep) => {
        const series = getSeries(ep.seriesId)!;
        if (code) return ep.season === Number(code[1]) && ep.number === Number(code[2]) && ep.kind === 'main';
        // Títulos ocultos pela proteção de spoilers não são pesquisáveis.
        const title = gate(ep);
        return (title && norm(title).includes(q)) || norm(series.title).includes(q) || norm(series.code) === q;
      })
      .slice(0, 60);
  }, [query, gate]);

  if (!results.length) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Nada encontrado para “{query}”.
        {journey.settings.spoilerShield && ' Títulos protegidos contra spoilers não aparecem na busca.'}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1" role="list" aria-label="Resultados da busca">
      {results.map((ep) => (
        <div role="listitem" key={ep.id}>
          <EpisodeRow journey={journey} episodeId={ep.id} showSeries />
        </div>
      ))}
    </div>
  );
}
