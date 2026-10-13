# AFTERFALL — The Walking Dead Universe Tracker

> O mundo acabou. Sua jornada continua.

PWA pessoal, instalável e offline para acompanhar todo o universo televisivo de *The Walking Dead*
em ordem cronológica (ou de lançamento): 7 séries, 8 séries de webisódios oficiais, **426 itens**.
Sem cadastro, sem backend, sem mensalidade — tudo fica no IndexedDB do seu aparelho.

**Aplicativo não oficial**, sem vínculo com AMC, Skybound ou detentores da marca. Não hospeda nem
aponta para vídeos.

## Rodar localmente

Requisitos: Node 22+ (testado com Node 24) e npm 10+.

```bash
npm install
npm run dev          # http://localhost:5173 (service worker desativado em dev)
```

Build de produção e preview (com service worker/offline):

```bash
npm run build        # tsc -b + vite build → dist/
npm run preview      # http://localhost:4173
```

`dist/` é estático: pode ser servido por qualquer host com fallback de SPA para `index.html`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção com PWA |
| `npm run preview` | Serve o build em `:4173` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict (app + e2e + configs) |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes end-to-end (Playwright; precisa de `npm run build` antes). `BASE_URL=https://... npm run test:e2e` testa um deploy |
| `npm run data:validate` | Valida a integridade do catálogo e da cronologia |
| `npm run data:fetch` | Atualiza metadados de episódios (TVmaze + conferência na Wikipedia) |
| `npm run data:titles` | Compara todos os títulos com as tabelas da Wikipedia e lista divergências |
| `npm run icons` | Regera os ícones PWA a partir de `assets/icon.svg` |
| `npm run check` | data:validate + lint + typecheck + testes + build |

Na primeira execução dos testes e2e: `npx playwright install chromium`.

## Instalar como aplicativo

- **Android (Chrome/Edge):** abra o site → menu ⋮ → *Instalar app* (ou o banner de instalação).
- **iOS/iPadOS (Safari 16.4+):** botão Compartilhar → *Adicionar à Tela de Início*.
- **Desktop (Chrome/Edge):** ícone de instalação na barra de endereço → *Instalar*.

Depois do primeiro carregamento, o app funciona totalmente offline. Quando uma nova versão é
publicada, aparece o aviso “Nova versão disponível” — atualizar nunca apaga seu progresso.
O app pede armazenamento persistente ao navegador, mas **exporte backups** em *Ajustes → Backup*:
se o navegador limpar os dados do site, o progresso local se perde.

## Arquitetura

```
src/
  domain/       modelos (types.ts), motor de cronologia (engine.ts), validação do catálogo
  content/      conteúdo editorial versionado
    generated/episodes.json   gerado por scripts/fetch-episodes.mjs (não editar à mão)
    extras.json               webisódios oficiais (pesquisa editorial com fontes)
    series.ts                 textos das séries (versão segura + completa)
    timeline.ts               fases e blocos da cronologia, com confiança e fontes
    sources.ts, availability.ts
  data/         Dexie/IndexedDB (schema versionado + migração), repositório de progresso, backup
  state/        hooks que unem catálogo + progresso + preferências; estado de UI (zustand)
  components/   sistema de design (botões, progresso, diálogos, arte procedural das séries)
  pages/        Início, Linha do tempo, Biblioteca, Série, Episódio, Estatísticas, Ajustes, Fontes, Onboarding
docs/research/  pesquisa bruta de cronologia, webisódios e disponibilidade (com URLs)
e2e/            testes Playwright
```

- **Progresso é indexado só pelo ID estável do episódio** (`twd-s05e10`, `flight-462-p03`).
  Ordem cronológica/lançamento e inclusão de extras são visões calculadas; trocá-las nunca toca nos dados.
- **Motor (`domain/engine.ts`)**: próximo episódio = primeiro não concluído depois do último item
  tocado (concluído/em andamento); se não houver, volta aos pulados. Funções puras, testadas.
- **Persistência**: Dexie com `version(n)` + `upgrade`. v1 → v2 migra `watched: boolean` para
  `status/favorite/note/updatedAt`. A v1 nunca foi publicada: existe como base para exercitar e testar
  o caminho de migração (o mesmo conversor migra backups no formato antigo).
- **Backup**: JSON com `app`, `schemaVersion`, `exportedAt`; validação com zod; prévia de conflitos;
  importação em modo *mesclar* (vale a alteração mais recente; favoritos/notas preservados) ou *substituir*.
- **Spoilers**: com a proteção ativa, títulos de itens futuros não são renderizados (nem pesquisáveis)
  até serem revelados; premissas que revelam destinos de personagens ficam atrás de “ver premissa completa”.
- **PWA**: `vite-plugin-pwa` (Workbox `generateSW`), precache do app shell, fontes latinas e catálogo;
  `navigateFallback` para rotas profundas offline; atualização sob confirmação.
- **Arte**: logo, ícones e paisagens de cada série são originais (SVG/CSS). Nenhuma imagem de terceiros.

## Atualizar os dados

```bash
npm run data:fetch -- --cutoff=2026-12-31   # só inclui episódios exibidos até a data
npm run data:validate
```

O script baixa episódios do TVmaze (CC BY-SA), confere a contagem por temporada na Wikipedia e
registra divergências em `warnings`. Episódios novos precisam entrar em `src/content/timeline.ts`
(o validador acusa qualquer episódio fora da cronologia ou duplicado).

## Dados: o que é verificado e o que não é

| Dado | Situação |
|---|---|
| Episódios, números, títulos originais, datas (7 séries, 363 ep.) | TVmaze; contagens por temporada e títulos conferidos com a Wikipedia (todas as contagens batem; 5 grafias corrigidas com fonte em `src/content/overrides.ts`) — corte 2026-10-13 |
| Webisódios (8 séries, 63 partes) e datas | Wikipedia + Fandom; data de *The Oath* tem divergência interna na Wikipedia (usado 01/10/2013) |
| Duração real dos episódios de TV | **Não disponível.** É exibida a duração da *faixa na TV* (TVmaze, inclui intervalos), sempre rotulada |
| Duração dos webisódios | Só *Torn Apart* e *Cold Storage* têm duração publicada; os demais ficam sem |
| Títulos em português | **Não exibidos** — não há fonte oficial verificada para todos |
| Sinopses por episódio | **Não incluídas** — não havia texto verificado e livre de spoilers; o app diz isso explicitamente |
| Cronologia entre séries | Âncoras da Wikipedia; encaixe fino da Fandom (fonte de fãs). Cada bloco mostra confiança: confirmada / provável / aproximada |
| Onde assistir no Brasil | Reportagens datadas (Omelete, Correio Braziliense), não fontes oficiais; exibidas com data e fonte, sem links para players |

Divergências conhecidas (detalhes em `docs/research/chronology-notes.md`): distância entre o final de
TWD e *Dead City*; encaixe de *Fear* T8 dentro de TWD T11; ordem entre as continuações; posição de
*Tales* “La Doña” (admitidamente estimada). *Daryl Dixon* T4 (prevista para fev/2027) não está incluída
por não ter sido exibida.

## Testes

- **Unitários (39)**: ordem determinística, avanço automático, concluído não retorna, extras/ordem
  não apagam progresso, lote, desfazer, persistência após reabrir o banco, migração v1→v2,
  round-trip de backup, validação/prévia/mesclagem, preferências simultâneas, marcação de série inteira
  intercalada (o cursor volta ao primeiro pendente), integridade do catálogo real.
- **E2E (31)**: onboarding, marcar/avançar/reload/desfazer, troca de ordem e extras, temporada em lote,
  série inteira marcada → próximo da cronologia, spoiler shield, export → import em outro navegador, import inválido, rotas diretas com refresh,
  offline após o primeiro carregamento, manifest linkado + service worker registrado, manifest/ícones, overflow em 360/390/768/1440 px,
  tema claro, navegação por teclado e auditoria axe (WCAG A/AA, sem violações sérias/críticas) nos temas escuro e claro.

Screenshots gerados pelos testes ficam em `screenshots/` (ignorado pelo git).

## Limitações conhecidas

- Testes automatizados rodam só no Chromium (desktop e viewports móveis). Instalação real em
  Android/iOS e o comportamento do Safari não foram testados em aparelho.
- No iOS, o backup é entregue pelo menu Compartilhar (salve em *Arquivos*); esse caminho não tem teste automatizado.
- Tempo assistido/restante usa a faixa de exibição na TV (com intervalos), não a duração real.
- A cronologia fina entre séries depende de uma fonte de fãs; veja os graus de confiança na timeline.
- O catálogo é estático por versão: episódios novos (ex.: *Daryl Dixon* T4) exigem `npm run data:fetch`,
  encaixe em `timeline.ts` e um novo build.

## Deploy

Produção: **https://afterfall-sooty.vercel.app** (Vercel, projeto `afterfall`, conectado a este repositório).
Cada push em `main` gera um deploy de produção automaticamente; outras branches geram previews.
`vercel.json` define o fallback de SPA e os cabeçalhos de cache (service worker e manifest sem cache,
assets com hash imutáveis).
