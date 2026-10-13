import { clsx } from 'clsx';
import { motion } from 'motion/react';
import type { WatchStatus } from '@/domain/types';

/** Checkbox circular com traço animado. Botão real, acessível por teclado. */
export function WatchToggle({
  status,
  onToggle,
  label,
  size = 'md',
}: {
  status: WatchStatus;
  onToggle: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const done = status === 'completed';
  const dims = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-9' : 'size-11';
  const ring = size === 'lg' ? 'size-9' : size === 'sm' ? 'size-6' : 'size-7';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={clsx('group/toggle relative z-10 grid shrink-0 place-items-center rounded-full', dims)}
    >
      <motion.span
        className={clsx(
          'relative grid place-items-center rounded-full border-[1.5px] transition-colors duration-200',
          ring,
          done
            ? 'border-success bg-success text-bg'
            : status === 'in_progress'
              ? 'border-warning text-warning'
              : 'border-line-strong text-transparent group-hover/toggle:border-muted',
        )}
        whileTap={{ scale: 0.82 }}
        animate={done ? { scale: [1, 1.14, 1] } : { scale: 1 }}
        transition={{ duration: 0.32 }}
      >
        {status === 'in_progress' && !done && <span className="size-2 rounded-full bg-warning" aria-hidden />}
        <svg viewBox="0 0 24 24" className="absolute size-[62%]" fill="none" aria-hidden>
          <motion.path
            d="M5 12.5l4.2 4.2L19 7"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
    </button>
  );
}
