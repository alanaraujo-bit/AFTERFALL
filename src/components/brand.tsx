import { useId } from 'react';
import { clsx } from 'clsx';

/** Marca do AFTERFALL: um sol se pondo atrás do horizonte, com o reflexo se apagando. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const clip = 'lm' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <clipPath id={clip}>
        <rect width="64" height="35" />
      </clipPath>
      <circle cx="32" cy="35" r="15" fill="var(--accent-strong)" clipPath={`url(#${clip})`} />
      <rect x="7" y="34" width="50" height="2.6" rx="1.3" fill="currentColor" />
      <rect x="20" y="41.5" width="24" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="26.5" y="48" width="11" height="2.4" rx="1.2" fill="currentColor" opacity="0.3" />
      <rect x="30" y="54.5" width="4" height="2.4" rx="1.2" fill="currentColor" opacity="0.16" />
    </svg>
  );
}

export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5 text-text', className)}>
      <LogoMark className={clsx(size === 'lg' ? 'size-14' : size === 'md' ? 'size-8' : 'size-6')} />
      <span
        className={clsx(
          'display tracking-[0.14em]',
          size === 'lg' ? 'text-5xl sm:text-6xl' : size === 'md' ? 'text-[1.4rem]' : 'text-lg',
        )}
      >
        After<span className="text-accent-ink">fall</span>
      </span>
    </span>
  );
}
