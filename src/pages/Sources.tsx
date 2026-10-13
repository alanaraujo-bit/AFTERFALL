import { ExternalLink } from 'lucide-react';
import { Container, PageHeader } from '@/components/Page';
import { ConfidenceBadge } from '@/components/ui';
import { INDEX } from '@/state/journey';
import { formatAirdate, formatInt } from '@/lib/format';

export function SourcesPage() {
  const { catalog } = INDEX;
  const main = catalog.episodes.filter((e) => e.kind === 'main').length;
  const extra = catalog.episodes.length - main;
  return (
    <>
      <PageHeader title="Fontes" eyebrow="Metodologia" back="/ajustes" />
      <Container className="max-w-3xl space-y-8 text-[0.9375rem] leading-relaxed text-text/90">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">O que está no catálogo</h2>
          <p>
            {formatInt(main)} episódios das 7 séries de TV e {formatInt(extra)} partes de 8 séries de webisódios oficiais, exibidos até{' '}
            {formatAirdate(catalog.verifiedAt)}. Episódios anunciados mas ainda não exibidos não entram.
          </p>
          <p className="text-muted">
            Títulos, datas e números vêm do TVmaze (dados CC BY-SA) e as contagens por temporada foram conferidas com a Wikipedia. Webisódios
            foram levantados na Wikipedia e na wiki de fãs Fandom. Títulos em português não são exibidos porque não há tradução oficial
            verificada para todos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Como a cronologia foi montada</h2>
          <p>
            Âncoras declaradas oficialmente (por exemplo, saltos temporais e quando cada série se passa) vêm da Wikipedia. O encaixe fino entre
            produções segue a “Chronological Episode Order” da wiki Fandom, uma fonte de fãs. Não existe uma ordem oficial completa — por isso
            cada bloco mostra o grau de confiança:
          </p>
          <ul className="space-y-2">
            {(['high', 'medium', 'approximate'] as const).map((c) => (
              <li key={c} className="flex items-start gap-3">
                <span className="w-40 shrink-0 pt-0.5">
                  <ConfidenceBadge level={c} />
                </span>
                <span className="text-sm text-muted">
                  {c === 'high' && 'Declarada por fonte oficial, pela Wikipedia ou pela própria série.'}
                  {c === 'medium' && 'Coerente com as fontes; a posição exata vem de análise de fãs.'}
                  {c === 'approximate' && 'Sem consenso ou admitidamente estimada. Use como sugestão.'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted">
            Divergências conhecidas: a distância entre o fim de The Walking Dead e Dead City varia conforme a fonte; o encaixe da 8ª temporada de
            Fear no meio da 11ª da série-mãe e a ordem entre as continuações vêm apenas de fontes de fãs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Durações</h2>
          <p className="text-muted">
            Para as séries de TV, o único dado disponível é a duração da faixa de exibição (TVmaze), que inclui intervalos. Ela aparece rotulada
            como “faixa na TV”. Para webisódios, só há duração quando a fonte a publica. Nada é estimado.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-text">Referências</h2>
          <ul className="card divide-y divide-line">
            {catalog.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2">
                  <span className="min-w-0 flex-1 truncate text-text">{s.label}</span>
                  <span className="shrink-0 text-xs text-faint tabular">{formatAirdate(s.verifiedAt)}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-faint" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
