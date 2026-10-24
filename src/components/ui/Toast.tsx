/** Thông báo nổi ở đáy màn hình. */

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useCalendarUi } from '@/stores/calendarUiStore'

export function ToastHost() {
  const { t } = useTranslation()
  const toasts = useCalendarUi((s) => s.toasts)
  const dismiss = useCalendarUi((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'animate-fade-in pointer-events-auto flex items-center justify-between gap-3',
            'rounded-[var(--radius-note)] border px-3 py-2.5 text-sm',
            'shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
            toast.tone === 'danger'
              ? 'border-[var(--color-danger)] bg-[var(--color-paper-raised)] text-[var(--color-danger)]'
              : 'border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] text-[var(--color-ink)]',
          )}
        >
          <span className="flex-1">{t(toast.messageKey, toast.params)}</span>

          {toast.action ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                toast.action?.run()
                dismiss(toast.id)
              }}
              className="shrink-0 font-semibold underline"
            >
              {t(toast.action.labelKey)}
            </Button>
          ) : null}

          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('common.close')}
            className="shrink-0 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}