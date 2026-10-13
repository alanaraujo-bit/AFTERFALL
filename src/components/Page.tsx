import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from './brand';
import { IconButton } from './ui';

export function Container({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={clsx('mx-auto w-full px-4 sm:px-6 lg:px-10', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>{children}</div>;
}

/** Cabeçalho das telas internas. No mobile mostra a marca; `back` adiciona voltar. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
}: {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="safe-top">
      <Container>
        <div className="flex h-14 items-center justify-between lg:hidden">
          {back ? (
            <IconButton label="Voltar" className="-ml-3" onClick={() => (history.length > 1 ? navigate(-1) : navigate(back))}>
              <ArrowLeft className="size-5" />
            </IconButton>
          ) : (
            <Wordmark size="sm" />
          )}
          <div className="flex items-center gap-1">{actions}</div>
        </div>
        <div className="flex items-end justify-between gap-6 pt-3 pb-6 lg:pt-12 lg:pb-8">
          <div className="min-w-0">
            {back && (
              <button
                onClick={() => (history.length > 1 ? navigate(-1) : navigate(back))}
                className="mb-4 hidden items-center gap-1.5 text-sm text-muted hover:text-text lg:inline-flex"
              >
                <ArrowLeft className="size-4" /> Voltar
              </button>
            )}
            {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
            <h1 className="display text-[2.6rem] text-text sm:text-5xl lg:text-6xl">{title}</h1>
            {description && <div className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{description}</div>}
          </div>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">{actions}</div>
        </div>
      </Container>
    </header>
  );
}
