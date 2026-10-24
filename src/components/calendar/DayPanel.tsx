/**
 * Panel chi tiết ngày.
 *
 * PC: cột bên phải, dạng timeline theo giờ (giống Google Calendar).
 * Mobile: bottom sheet, cũng dùng timeline nhưng thấp hơn.
 *
 * Bấm vào khoảng trống một giờ -> mở form tạo lịch bắt đầu đúng giờ đó.
 * Ấn-giữ rồi kéo theo giờ -> mở form với đúng khoảng giờ đã kéo.
 */

import { useTranslation } from 'react-i18next'

import { DayTimeline } from '@/components/calendar/DayTimeline'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useCalendarUi } from '@/stores/calendarUiStore'
import { useAuthStore } from '@/stores/authStore'
import type { Occurrence } from '@/types'

interface DayPanelProps {
  dateString: string
  occurrences: Occurrence[]
  onClose: () => void
}

export function DayPanel({ dateString, occurrences, onClose }: DayPanelProps) {
  const { t } = useTranslation()
  const openEdit = useCalendarUi((s) => s.openEdit)
  const openCreate = useCalendarUi((s) => s.openCreate)
  const openCreateRange = useCalendarUi((s) => s.openCreateRange)
  const weekStart = useAuthStore((s) => s.user?.week_start ?? 1)

  return (
    <aside
      className={cn(
        'flex flex-col border-[var(--color-rule)] bg-[var(--color-paper)]',
        // Mobile: bottom sheet.
        'fixed inset-x-0 bottom-0 z-40 h-[75vh] animate-sheet-up rounded-t-2xl border-t',
        // PC: cột bên phải.
        'lg:static lg:z-auto lg:h-auto lg:w-[22rem] lg:shrink-0 lg:animate-fade-in lg:rounded-none lg:border-t-0 lg:border-l',
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-rule)] px-3 py-1.5">
        <p className="tnum text-micro text-[var(--color-ink-faint)]">
          {t('day.eventCount', { count: occurrences.length })}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="shrink-0 rounded p-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
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

      <DayTimeline
        dateString={dateString}
        occurrences={occurrences}
        onOpenEvent={openEdit}
        onCreateRange={(startMinutes, endMinutes) =>
          openCreateRange(dateString, startMinutes, endMinutes)
        }
        weekStart={weekStart}
        className="min-h-0 flex-1"
      />

      <footer className="shrink-0 border-t border-[var(--color-rule)] px-3 py-2">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => openCreate(dateString)}
        >
          {t('day.addForDay')}
        </Button>
      </footer>
    </aside>
  )
}
