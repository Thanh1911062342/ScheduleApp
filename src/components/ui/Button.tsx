/** Nút bấm — các biến thể theo phong cách giấy, viền 1px thay vì đổ bóng. */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-ink)] text-[var(--color-paper)] border border-[var(--color-ink)] hover:opacity-90',
  secondary:
    'bg-[var(--color-paper-raised)] text-[var(--color-ink)] border border-[var(--color-rule-strong)] hover:bg-[var(--color-paper-sunken)]',
  ghost:
    'bg-transparent text-[var(--color-ink-soft)] border border-transparent hover:bg-[var(--color-paper-sunken)] hover:text-[var(--color-ink)]',
  danger:
    'bg-transparent text-[var(--color-danger)] border border-transparent hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-mini gap-1',
  md: 'h-9 px-3.5 text-sm gap-1.5',
  icon: 'h-8 w-8 p-0 justify-center',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center rounded-[var(--radius-note)] font-medium transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}