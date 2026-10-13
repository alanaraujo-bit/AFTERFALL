import { clsx } from 'clsx';
import type { Confidence } from '@/domain/types';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type Size = 'sm' | 'md' | 'lg';

/** Classes de botão, reutilizáveis em links (`<Link className={buttonStyles(...)}>`). */
export function buttonStyles(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return clsx(
    'group/btn relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-[transform,background-color,box-shadow,color] duration-200 ease-out-soft active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100',
    size === 'sm' && 'h-9 px-3.5 text-[0.8125rem]',
    size === 'md' && 'h-11 px-5 text-sm',
    size === 'lg' && 'h-14 px-7 text-base',
    variant === 'primary' && 'bg-accent text-white shadow-[0_10px_30px_-10px_var(--accent)] hover:bg-accent-strong',
    variant === 'secondary' && 'border border-line-strong bg-surface-2 text-text hover:bg-surface-3',
    variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-text',
    variant === 'danger' && 'border border-accent/40 bg-accent-soft text-accent-ink hover:bg-accent hover:text-white',
    className,
  );
}

export const CONFIDENCE: Record<Confidence, { label: string; dot: string; hint: string }> = {
  high: { label: 'Posição confirmada', dot: 'bg-success', hint: 'Declarada por fontes oficiais ou pela própria série.' },
  medium: { label: 'Posição provável', dot: 'bg-warning', hint: 'Coerente com as fontes, mas o encaixe exato vem de análise de fãs.' },
  approximate: { label: 'Posição aproximada', dot: 'bg-faint', hint: 'Sem consenso entre as fontes. Use como sugestão.' },
};

export const confidenceHint = (level: Confidence) => CONFIDENCE[level].hint;
