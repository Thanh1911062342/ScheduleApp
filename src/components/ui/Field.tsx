/** Ô nhập liệu + nhãn, theo phong cách giấy. */

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

const FIELD_BASE =
  'w-full rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] ' +
  'bg-[var(--color-paper-raised)] px-2.5 py-1.5 text-sm text-[var(--color-ink)] ' +
  'placeholder:text-[var(--color-ink-faint)] transition-colors ' +
  'focus:border-[var(--color-accent)] focus:outline-none'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? (
        <label className="text-mini font-medium text-[var(--color-ink-soft)]">{label}</label>
      ) : null}
      {children}
      {error ? (
        <p className="text-micro text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="text-micro text-[var(--color-ink-faint)]">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, 'resize-none leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_BASE, 'cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

/** Nhóm các nút chọn một trong nhiều — dùng cho chế độ, tần suất lặp. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode; disabled?: boolean }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[6px] px-2.5 py-1 text-mini font-medium transition-colors',
              active
                ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunken)]',
              option.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Công tắc bật/tắt. */
export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  id?: string
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 select-none">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
            : 'border-[var(--color-rule-strong)] bg-[var(--color-paper-sunken)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      <span className="text-mini text-[var(--color-ink)]">{label}</span>
    </label>
  )
}

/** Ô đánh dấu vuông, dùng cho checklist. */
export function Checkbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        checked
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
          : 'border-[var(--color-rule-strong)] bg-transparent hover:border-[var(--color-ink-faint)]',
        className,
      )}
    >
      {checked ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M1.5 5.2l2.2 2.2L8.5 2.7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  )
}

/** Nút radio chỉ để hiển thị — việc bấm do phần tử cha xử lý. */
export function Radio({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
        checked ? 'border-[var(--color-accent)]' : 'border-[var(--color-rule-strong)]',
        className,
      )}
    >
      {checked ? <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" /> : null}
    </span>
  )
}

/** Chọn màu từ bảng màu lịch. */
export function ColorSwatches({
  colors,
  value,
  onChange,
  allowDefault,
}: {
  colors: string[]
  value: string | null
  onChange: (color: string | null) => void
  allowDefault?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowDefault ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="default"
          aria-label="default color"
          className={cn(
            'h-6 w-6 rounded-full border-2 bg-transparent',
            value === null
              ? 'border-[var(--color-ink)]'
              : 'border-[var(--color-rule-strong)]',
          )}
        />
      ) : null}
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          aria-label={color}
          className={cn(
            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
            value === color ? 'border-[var(--color-ink)]' : 'border-transparent',
          )}
        />
      ))}
    </div>
  )
}