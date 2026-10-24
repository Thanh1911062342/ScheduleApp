/**
 * Overlay: dialog giữa màn hình trên PC, bottom sheet trên mobile.
 *
 * Tự viết thay vì dùng thư viện vì cần kiểm soát hành vi responsive và
 * phong cách giấy (viền thay vì đổ bóng nặng).
 */

import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Rộng hơn cho form nhiều cột (PC). */
  size?: 'md' | 'lg'
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Esc để đóng + khoá cuộn nền + trả focus về nơi cũ khi đóng.
  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      // Giữ focus trong dialog.
      if (event.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    // Focus vào phần tử đầu tiên sau khi mở.
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = originalOverflow
      clearTimeout(timer)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Lớp mờ. Bấm ra ngoài để đóng. */}
      <button
        type="button"
        aria-label="close"
        className="animate-scrim-in absolute inset-0 cursor-default bg-black/25 dark:bg-black/50"
        onClick={onClose}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className={cn(
          'animate-sheet-up sm:animate-fade-in relative flex max-h-[92vh] w-full flex-col',
          'border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)]',
          'rounded-t-2xl sm:rounded-[var(--radius-note)]',
          'shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
          'sm:mx-4',
        )}
      >
        {title ? (
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-rule)] px-4 py-3">
            <h2 className="font-serif text-base font-semibold text-[var(--color-ink)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              aria-label="close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>
        ) : null}

        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-[var(--color-rule)] px-4 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  )
}