/**
 * Chế độ xem Tuần.
 *
 * PC: lưới giờ 24h với 7 cột ngày (chung `TimeGrid` với chế độ Ngày) —
 * cùng kiểu Google Calendar: tiêu đề thứ/ngày, dải sự kiện cả ngày,
 * khối sự kiện đặt đúng vị trí theo giờ; bấm hoặc ấn-giữ-kéo trên ô trống
 * để tạo lịch nhanh theo khung giờ.
 * Mobile: danh sách agenda theo ngày (lưới theo giờ không dùng được
 * trên màn hình hẹp).
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TimeGrid, type TimeGridColumn } from '@/components/calendar/TimeGrid'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatTime, toDateString, weekDays, weekdayLongLabel } from '@/lib/date'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { Occurrence } from '@/types'

interface WeekViewProps {
  cursor: Date
  weekStart: number
  occurrencesByDate: Map<string, Occurrence[]>
  onOpenDay: (date: string) => void
  onOpenEvent: (occurrence: Occurrence) => void
  onAddForDay: (date: string) => void
  /** Mở form tạo lịch cho khoảng giờ đã bấm/kéo trên lưới tuần. */
  onCreateRange?: (date: string, startMinutes: number, endMinutes: number) => void
}

export function WeekView({
  cursor,
  weekStart,
  occurrencesByDate,
  onOpenDay,
  onOpenEvent,
  onAddForDay,
  onCreateRange,
}: WeekViewProps) {
  const { t } = useTranslation()
  const days = weekDays(cursor, weekStart)
  const today = toDateString(new Date())
  const zoom = useCalendarUi((s) => s.timelineZoom.week)
  const setTimelineZoom = useCalendarUi((s) => s.setTimelineZoom)

  const columns = useMemo<TimeGridColumn[]>(
    () =>
      days.map((day, index) => {
        const dateString = toDateString(day)
        const isToday = dateString === today
        return {
          dateString,
          occurrences: occurrencesByDate.get(dateString) ?? [],
          isToday,
          header: (
            <button
              type="button"
              onClick={() => onOpenDay(dateString)}
              title={t('day.hintClick')}
              className="flex w-full flex-col items-center gap-0.5 px-1 py-1.5 transition-colors hover:bg-[var(--color-paper-sunken)]"
            >
              <span
                className={cn(
                  'block text-[10px] font-medium tracking-[0.08em] uppercase',
                  isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-soft)]',
                )}
              >
                {weekdayLongLabel(weekStart, index)}
              </span>
              <span
                className={cn(
                  'tnum flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium leading-none',
                  isToday
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-ink)]',
                )}
              >
                {day.getDate()}
              </span>
            </button>
          ),
        }
      }),
    // today/weekStart ít đổi; occurrencesByDate đổi khi refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, occurrencesByDate, today, weekStart, onOpenDay, t],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* PC: lưới giờ 7 cột */}
      <TimeGrid
        columns={columns}
        onOpenEvent={onOpenEvent}
        zoom={zoom}
        onZoomChange={(z) => setTimelineZoom('week', z)}
        onCreateRange={(date, start, end) => {
          if (onCreateRange) onCreateRange(date, start, end)
          else onAddForDay(date)
        }}
        className="hidden min-h-0 flex-1 border-l border-[var(--color-rule)] md:flex"
      />

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
