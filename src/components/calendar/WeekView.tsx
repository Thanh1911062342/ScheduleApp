/**
 * Chế độ xem Tuần.
 *
 * PC: lưới 7 cột theo giờ. Mobile: danh sách agenda theo ngày (lưới theo giờ
 * không dùng được trên màn hình hẹp).
 */

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatTime, toDateString, weekDays, weekdayLongLabel } from '@/lib/date'
import type { Occurrence } from '@/types'

interface WeekViewProps {
  cursor: Date
  weekStart: number
  occurrencesByDate: Map<string, Occurrence[]>
  onOpenDay: (date: string) => void
  onOpenEvent: (occurrence: Occurrence) => void
  onAddForDay: (date: string) => void
}

export function WeekView({
  cursor,
  weekStart,
  occurrencesByDate,
  onOpenDay,
  onOpenEvent,
  onAddForDay,
}: WeekViewProps) {
  const { t } = useTranslation()
  const days = weekDays(cursor, weekStart)
  const today = toDateString(new Date())

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* PC: cột theo ngày */}
      <div className="scroll-thin hidden min-h-0 flex-1 overflow-y-auto md:block">
        <div className="grid min-h-full grid-cols-7 border-l border-[var(--color-rule)]">
          {days.map((day, index) => {
            const dateString = toDateString(day)
            const items = occurrencesByDate.get(dateString) ?? []
            const isToday = dateString === today

            return (
              <div
                key={dateString}
                className="flex min-h-full flex-col border-r border-[var(--color-rule)]"
              >
                <button
                  type="button"
                  onClick={() => onOpenDay(dateString)}
                  className={cn(
                    'sticky top-0 z-10 shrink-0 border-b border-[var(--color-rule)] px-2 py-2 text-center transition-colors',
                    isToday ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-paper)] hover:bg-[var(--color-paper-sunken)]',
                  )}
                >
                  <span
                    className={cn(
                      'block text-micro',
                      isToday ? 'text-[var(--color-paper)]' : 'text-[var(--color-ink-faint)]',
                    )}
                  >
                    {weekdayLongLabel(weekStart, index)}
                  </span>
                  <span
                    className={cn(
                      'tnum block font-serif text-base font-semibold',
                      isToday ? 'text-[var(--color-paper)]' : 'text-[var(--color-ink)]',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </button>

                <div className="flex flex-1 flex-col gap-1 p-1.5">
                  {items.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => onAddForDay(dateString)}
                      className="flex flex-1 items-start justify-center rounded-[6px] py-3 text-micro text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-paper-sunken)]"
                    >
                      +
                    </button>
                  ) : (
                    items.map((occ) => (
                      <button
                        key={occ.occurrence_key}
                        type="button"
                        onClick={() => onOpenEvent(occ)}
                        className="flex flex-col gap-0.5 rounded-[6px] border border-[var(--color-rule)] px-1.5 py-1 text-left transition-colors hover:bg-[var(--color-paper-sunken)]"
                        style={{
                          borderLeftWidth: 3,
                          borderLeftColor: occ.color ?? occ.calendar.color,
                        }}
                      >
                        <span
                          className={cn(
                            'truncate text-micro font-medium text-[var(--color-ink)]',
                            occ.status === 'done' && 'line-through opacity-60',
                          )}
                        >
                          {occ.title}
                        </span>
                        {!occ.is_all_day && occ.start_time ? (
                          <span className="tnum text-[10px] text-[var(--color-ink-faint)]">
                            {formatTime(occ.start_time)}
                            {occ.end_time ? ` – ${formatTime(occ.end_time)}` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-ink-faint)]">
                            {t('event.allDay')}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: agenda theo ngày */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto md:hidden">
        {days.map((day, index) => {
          const dateString = toDateString(day)
          const items = occurrencesByDate.get(dateString) ?? []
          const isToday = dateString === today

          return (
            <section key={dateString} className="border-b border-[var(--color-rule)]">
              <div
                className={cn(
                  'flex items-center justify-between px-3 py-2',
                  isToday && 'bg-[var(--color-accent-soft)]',
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenDay(dateString)}
                  className="flex items-baseline gap-2 text-left"
                >
                  <span className="font-serif text-sm font-semibold text-[var(--color-ink)]">
                    {weekdayLongLabel(weekStart, index)}
                  </span>
                  <span className="tnum text-mini text-[var(--color-ink-faint)]">
                    {day.getDate()}
                  </span>
                </button>
                <Button size="sm" variant="ghost" onClick={() => onAddForDay(dateString)}>
                  {t('common.add')}
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="px-3 pb-3 text-micro text-[var(--color-ink-faint)]">
                  {t('day.noEvents')}
                </p>
              ) : (
                <div className="flex flex-col gap-1 px-3 pb-3">
                  {items.map((occ) => (
                    <button
                      key={occ.occurrence_key}
                      type="button"
                      onClick={() => onOpenEvent(occ)}
                      className="flex items-start gap-2 rounded-[6px] border border-[var(--color-rule)] px-2 py-1.5 text-left"
                    >
                      <span
                        className="mt-0.5 h-3 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: occ.color ?? occ.calendar.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate text-mini font-medium text-[var(--color-ink)]',
                            occ.status === 'done' && 'line-through opacity-60',
                          )}
                        >
                          {occ.title}
                        </span>
                        <span className="tnum block text-micro text-[var(--color-ink-faint)]">
                          {occ.is_all_day ? t('event.allDay') : formatTime(occ.start_time)}
                          {occ.location ? ` · ${occ.location}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}