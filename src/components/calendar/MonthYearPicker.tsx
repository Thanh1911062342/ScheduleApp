/**
 * Popover chọn tháng và năm nhanh — mở khi bấm vào tiêu đề "Tháng 10 2026".
 * Đây là cách đổi tháng nhanh hơn nhiều so với bấm ‹ › nhiều lần.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { currentDateLocale } from '@/lib/date'
import { format } from 'date-fns'

interface MonthYearPickerProps {
  open: boolean
  cursor: Date
  onClose: () => void
  onPick: (date: Date) => void
}

export function MonthYearPicker({ open, cursor, onClose, onPick }: MonthYearPickerProps) {
  const { t } = useTranslation()
  const [year, setYear] = useState(cursor.getFullYear())
  const panelRef = useRef<HTMLDivElement>(null)

  // Mỗi lần mở lại đồng bộ năm theo con trỏ hiện tại.
  useEffect(() => {
    if (open) setYear(cursor.getFullYear())
  }, [open, cursor])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function onPointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Dùng `pointerdown` + delay để không đóng ngay khi vừa mở.
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointerDown), 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  const locale = currentDateLocale()
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    format(new Date(year, i, 1), 'LLLL', { locale }),
  )
  const currentYear = new Date().getFullYear()
  const activeMonth = cursor.getMonth()
  const activeYear = cursor.getFullYear()

  return (
    <div
      ref={panelRef}
      className={cn(
        'animate-fade-in absolute top-full left-0 z-40 mt-1 w-64',
        'rounded-[var(--radius-note)] border border-[var(--color-rule-strong)]',
        'bg-[var(--color-paper-raised)] p-2.5',
        'shadow-[0_6px_20px_rgba(0,0,0,0.10)]',
      )}
      role="dialog"
      aria-label={t('calendar.pickMonthYear')}
    >
      <div className="mb-2 flex items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setYear((y) => y - 1)}
          aria-label={t('calendar.previous')}
        >
          <ChevronIcon direction="left" />
        </Button>
        <span className="tnum font-serif text-sm font-semibold">{year}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setYear((y) => y + 1)}
          aria-label={t('calendar.next')}
        >
          <ChevronIcon direction="right" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {monthNames.map((name, index) => {
          const active = index === activeMonth && year === activeYear
          const isNow = index === new Date().getMonth() && year === currentYear
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                // Giữ ngày ở mức 1 để tránh tràn tháng (31 -> tháng 2).
                onPick(new Date(year, index, 1))
                onClose()
              }}
              className={cn(
                'rounded-[6px] px-2 py-1.5 text-mini capitalize transition-colors',
                active
                  ? 'bg-[var(--color-ink)] font-semibold text-[var(--color-paper)]'
                  : isNow
                    ? 'text-[var(--color-accent)] hover:bg-[var(--color-paper-sunken)]'
                    : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunken)]',
              )}
            >
              {name}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex justify-center border-t border-[var(--color-rule)] pt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onPick(new Date())
            onClose()
          }}
        >
          {t('calendar.today')}
        </Button>
      </div>
    </div>
  )
}

export function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}