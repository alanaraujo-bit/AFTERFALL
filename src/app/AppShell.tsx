import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { MotionConfig, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { clsx } from 'clsx';
import { ChartColumn, House, LibraryBig, Settings2, Waypoints, WifiOff } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { ProgressBar } from '@/components/ui';
import { useJourney, useSettings } from '@/state/journey';
import { formatPercent } from '@/lib/format';
import type { UserSettings } from '@/domain/types';

const NAV = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/linha-do-tempo', label: 'Linha do tempo', short: 'Timeline', icon: Waypoints },
  { to: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
  { to: '/estatisticas', label: 'Estatísticas', short: 'Números', icon: ChartColumn },
  { to: '/ajustes', label: 'Ajustes', icon: Settings2 },
];

function useApplyPreferences(settings: UserSettings | undefined) {
  const [systemLight, setSystemLight] = useState(() => matchMedia('(prefers-color-scheme: light)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const on = () => setSystemLight(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!settings) return;
    const theme = settings.theme === 'system' ? (systemLight ? 'light' : 'dark') : settings.theme;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.motion = settings.motion === 'system' ? '' : settings.motion;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#efebe4' : '#0e0f0f');
    try {
      localStorage.setItem('afterfall:theme', settings.theme);
    } catch {
      /* armazenamento indisponível: apenas não evita o flash inicial */
    }
  }, [settings, systemLight]);
  if (!settings) return 'dark' as const;
  return settings.theme === 'system' ? (systemLight ? ('light' as const) : ('dark' as const)) : settings.theme;
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function SideNav() {
  const journey = useJourney();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-bg/80 px-4 pt-7 pb-6 backdrop-blur-xl lg:flex xl:w-72">
      <NavLink to="/" className="px-3" aria-label="AFTERFALL — início">
        <Wordmark size="md" />
      </NavLink>
      <p className="mt-2 px-3 text-xs text-faint">The Walking Dead Universe Tracker</p>
      <nav aria-label="Principal" className="mt-10 flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors',
                isActive ? 'text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="side-active"
                    className="absolute inset-0 -z-10 rounded-xl border border-line bg-surface-2"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
                <Icon className={clsx('size-[1.15rem]', isActive && 'text-accent-ink')} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {journey && (
        <div className="mt-auto rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Jornada</span>
            <span className="text-sm font-semibold text-text tabular">{formatPercent(journey.summary.ratio)}</span>
          </div>
          <ProgressBar value={journey.summary.ratio} className="mt-3" label="Progresso da jornada" />
          <p className="mt-2.5 text-xs text-faint tabular">
            {journey.summary.completed} de {journey.summary.total} ·{' '}
            {journey.settings.orderMode === 'chronological' ? 'cronológica' : 'lançamento'}
          </p>
        </div>
      )}
    </aside>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl safe-bottom lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              clsx(
                'relative flex flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
                isActive ? 'text-text' : 'text-faint',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-active"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className={clsx('size-[1.3rem] transition-transform', isActive && 'scale-105 text-accent-ink')} aria-hidden />
                <span className="max-w-full truncate px-0.5">{short ?? label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppShell() {
  const settings = useSettings();
  const online = useOnline();
  const location = useLocation();
  const theme = useApplyPreferences(settings);

  if (settings && !settings.onboardingDone && location.pathname === '/') {
    return <Navigate to="/boas-vindas" replace />;
  }

  return (
    <MotionConfig reducedMotion={settings?.motion === 'reduced' ? 'always' : settings?.motion === 'full' ? 'never' : 'user'}>
      <div className="grain min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only z-[80] rounded-full bg-accent px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
        <SideNav />
        {!online && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-surface-2 px-4 py-1.5 text-xs text-muted safe-top lg:pl-64 xl:pl-72" role="status">
            <WifiOff className="size-3.5" aria-hidden /> Offline — tudo continua funcionando e salvo neste aparelho.
          </div>
        )}
        <main id="conteudo" className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12 lg:pl-64 xl:pl-72">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
        <BottomNav />
        <Toaster
          position="bottom-center"
          theme={theme}
          offset={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          toastOptions={{
            classNames: {
              toast: '!bg-surface-2 !border-line-strong !text-text !rounded-2xl !shadow-2xl',
              description: '!text-muted',
              actionButton: '!bg-accent !text-white !rounded-full !font-semibold',
            },
          }}
        />
        <ScrollRestoration />
      </div>
    </MotionConfig>
  );
}
