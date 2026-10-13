import { isRouteErrorResponse, useRouteError } from 'react-router';
import { LogoMark } from '@/components/brand';

/** Error boundary de rota: nada aqui toca nos dados salvos. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Erro desconhecido';
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-text">
      <div className="max-w-sm">
        <LogoMark className="mx-auto size-16 text-text" />
        <h1 className="display mt-6 text-4xl">Algo saiu do caminho</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Esta tela encontrou um erro inesperado. Seu progresso está salvo neste aparelho e não foi afetado.
        </p>
        <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs break-words text-faint">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="h-11 rounded-full border border-line-strong px-5 text-sm font-semibold" onClick={() => location.reload()}>
            Recarregar
          </button>
          <a className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white" href="/">
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
