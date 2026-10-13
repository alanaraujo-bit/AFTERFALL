import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { Confidence } from '@/domain/types';
import { buttonStyles, CONFIDENCE, type Size, type Variant } from './styles';

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }
>(function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles(variant, size, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>(function IconButton({ label, active, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-90',
        active ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Progresso                                                           */
/* ------------------------------------------------------------------ */
export function ProgressBar({
  value,
  className,
  color,
  label,
  size = 'md',
}: {
  value: number;
  className?: string;
  color?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={clsx('relative w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1' : 'h-1.5', className)}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color ?? 'var(--accent)' }}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 6,
  color = 'var(--accent)',
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', stiffness: 80, damping: 22 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controles                                                           */
/* ------------------------------------------------------------------ */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[0.9375rem] font-medium text-text">{label}</span>
        {description && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{description}</span>}
      </label>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 rounded-full border border-line-strong bg-surface-3 transition-colors duration-200 data-[state=checked]:border-transparent data-[state=checked]:bg-accent"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-text shadow transition-transform duration-200 ease-out-soft data-[state=checked]:translate-x-[1.3rem] data-[state=checked]:bg-white" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('relative flex rounded-full border border-line bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'relative z-10 flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors duration-200',
              active ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 -z-10 rounded-full border border-line-strong bg-surface"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selos e estados                                                     */
/* ------------------------------------------------------------------ */
export function ConfidenceBadge({ level, compact }: { level: Confidence; compact?: boolean }) {
  const c = CONFIDENCE[level];
  return (
    <span title={c.hint} className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-wide text-muted">
      <span className={clsx('size-1.5 rounded-full', c.dot)} aria-hidden />
      {compact ? c.label.replace('Posição ', '') : c.label}
    </span>
  );
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap',
        className,
      )}
      style={
        color
          ? { borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--text))`, background: `color-mix(in srgb, ${color} 12%, transparent)` }
          : { borderColor: 'var(--line-strong)', color: 'var(--muted)' }
      }
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full border border-line bg-surface-2 text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action, id }: { eyebrow?: string; title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 id={id} className="text-lg font-semibold tracking-tight text-text">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
