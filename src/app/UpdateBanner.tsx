import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registra o service worker (em qualquer rota, inclusive no onboarding) e avisa quando há
 * versão nova. A atualização só acontece quando a pessoa confirma; dados locais são mantidos.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-surface-2 p-3 pl-4 text-text shadow-2xl lg:bottom-6 lg:left-auto lg:right-6"
    >
      <RefreshCw className="size-4 shrink-0 text-accent-ink" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        {needRefresh ? 'Nova versão disponível. Seu progresso é mantido.' : 'Pronto para uso offline.'}
      </p>
      {needRefresh ? (
        <>
          <button className="h-9 rounded-full px-3 text-sm text-muted hover:text-text" onClick={() => setNeedRefresh(false)}>
            Depois
          </button>
          <button className="h-9 rounded-full bg-accent px-4 text-sm font-semibold text-white" onClick={() => void updateServiceWorker(true)}>
            Atualizar
          </button>
        </>
      ) : (
        <button className="h-9 rounded-full px-3 text-sm text-muted hover:text-text" onClick={() => setOfflineReady(false)}>
          Ok
        </button>
      )}
    </div>
  );
}
