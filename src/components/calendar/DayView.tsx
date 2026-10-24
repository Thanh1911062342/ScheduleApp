/**
 * Chế độ xem Ngày — danh sách theo trình tự thời gian.
 *
 * Sự kiện cả ngày lên đầu, sau đó sự kiện có giờ sắp theo giờ bắt đầu.
 */

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatTime, toDateString } from '@/lib/date'
import type { Occurrence } from '@/types'

interface DayViewProps {
  cursor: Date
  occurrencesByDate: Map<string, Occurrence[]>
  onOpenEvent: (occurrence: Occurrence) => void
  onAddForDay: (date: string) => void
}

export function DayView({ cursor, occurrencesByDate, onOpenEvent, onAddForDay }: DayViewProps) {
  const { t } = useTranslation()
  const dateString = toDateString(cursor)
  const items = occurrencesByDate.get(dateString) ?? []

  const sorted = [...items].sort((a, b) => {
    if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6">
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-mini text-[var(--color-ink-faint)]">{t('day.noEvents')}</p>
          <Button variant="secondary" onClick={() => onAddForDay(dateString)}>
            {t('day.addForDay')}
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {sorted.map((occ) => {
            const color = occ.color ?? occ.calendar.color
            const isDone = occ.status === 'done'

            return (
              <button
                key={occ.occurrence_key}
                type="button"
                onClick={() => onOpenEvent(occ)}
                className={cn(
                  'flex items-start gap-3 rounded-[var(--radius-note)] border border-[var(--color-rule)]',
                  'px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-paper-sunken)]',
                )}
                style={{ borderLeftWidth: 3, borderLeftColor: color }}
              >
                <span className="tnum w-20 shrink-0 text-mini text-[var(--color-ink-soft)]">
                  {occ.is_all_day ? t('event.allDay') : formatTime(occ.start_time)}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm font-medium text-[var(--color-ink)]',
                      isDone && 'line-through opacity-60',
                    )}
                  >
                    {occ.title}
                  </span>

                  {occ.location ? (
                    <span className="mt-0.5 block truncate text-micro text-[var(--color-ink-faint)]">
                      {occ.location}
                    </span>
                  ) : null}

                  {occ.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-micro text-[var(--color-ink-faint)]">
                      {occ.description}
                    </span>
                  ) : null}

                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-micro text-[var(--color-ink-faint)]">
                      {occ.calendar.name}
                    </span>
                    {occ.is_recurring ? (
                      <span className="text-micro text-[var(--color-ink-faint)]">↻</span>
                    ) : null}
                    {occ.checklist_total > 0 ? (
                      <span className="tnum text-micro text-[var(--color-ink-faint)]">
                        {t('event.checklistProgress', {
                          done: occ.checklist_done,
                          total: occ.checklist_total,
                        })}
                      </span>
                    ) : null}
                  </span>
                </span>

                {!occ.is_all_day && occ.end_time ? (
                  <span className="tnum shrink-0 text-micro text-[var(--color-ink-faint)]">
                    {formatTime(occ.end_time)}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}