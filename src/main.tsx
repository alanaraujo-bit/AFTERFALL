import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { UpdateBanner } from './app/UpdateBanner';
import './styles.css';

// Pede ao navegador para não descartar o IndexedDB sob pressão de espaço (quando suportado).
void navigator.storage?.persist?.().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <UpdateBanner />
  </StrictMode>,
);
