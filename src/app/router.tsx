import { createBrowserRouter } from 'react-router';
import { AppShell } from './AppShell';
import { RouteError } from './RouteError';
import { HomePage } from '@/pages/Home';
import { TimelinePage } from '@/pages/Timeline';
import { LibraryPage } from '@/pages/Library';
import { SeriesPage } from '@/pages/Series';
import { EpisodePage } from '@/pages/Episode';
import { NotFoundPage } from '@/pages/NotFound';

// Telas menos frequentes ficam em chunks separados (todas continuam pré-cacheadas para uso offline).
export const router = createBrowserRouter([
  {
    path: '/boas-vindas',
    lazy: () => import('@/pages/Onboarding').then((m) => ({ Component: m.OnboardingPage })),
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'linha-do-tempo', element: <TimelinePage /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'biblioteca/:seriesId', element: <SeriesPage /> },
      { path: 'episodio/:episodeId', element: <EpisodePage /> },
      { path: 'estatisticas', lazy: () => import('@/pages/Stats').then((m) => ({ Component: m.StatsPage })) },
      { path: 'ajustes', lazy: () => import('@/pages/Settings').then((m) => ({ Component: m.SettingsPage })) },
      { path: 'ajustes/fontes', lazy: () => import('@/pages/Sources').then((m) => ({ Component: m.SourcesPage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
