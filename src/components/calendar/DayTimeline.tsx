/**
 * Timeline theo giờ, lấy cảm hứng từ Google Calendar (xem image.png).
 *
 * Dùng cho panel ngày (sidebar) và chế độ xem Ngày toàn màn hình.
 * Thực chất là `TimeGrid` với đúng 1 cột ngày + tiêu đề thứ/ngày phía trên.
 *
 * Cử chỉ trên lưới giờ:
 *  - Bấm vào khoảng trống -> form tạo lịch 1 tiếng từ giờ đó.
 *  - Ấn-giữ rồi kéo (ví dụ 8 AM xuống 12 PM) -> form mở với đúng khoảng đã kéo.
 */

import { useMemo } from 'react'

import { TimeGrid } from '@/components/calendar/TimeGrid'
import { fromDateString, weekdayLongLabel } from '@/lib/date'
import type { Occurrence } from '@/types'

interface DayTimelineProps {
  dateString: string
  occurrences: Occurrence[]
  onOpenEvent: (occurrence: Occurrence) => void
  /** Mở form tạo lịch cho khoảng giờ [startMinutes, endMinutes) của ngày. */
  onCreateRange: (startMinutes: number, endMinutes: number) => void
  weekStart?: number
  className?: string
}

export function DayTimeline({
  dateString,
  occurrences,
  onOpenEvent,
  onCreateRange,
  weekStart = 1,
  className,
}: DayTimelineProps) {
  const dateObj = useMemo(() => fromDateString(dateString), [dateString])
  const dayNumber = dateObj.getDate()
  // date.getDay(): CN=0. Đổi sang chỉ số của mảng thứ đã xoay theo tuần.
  const weekdayIndex = (dateObj.getDay() + 6) % 7
  const weekdayLabel = weekdayLongLabel(weekStart, weekdayIndex)

  const columns = useMemo(
    () => [
      {
        dateString,
        occurrences,
        header: (
          <div className="flex flex-col items-center justify-center px-1 py-2 text-center">
            <span className="text-micro font-semibold tracking-widest text-[var(--color-ink-faint)] uppercase">
              {weekdayLabel}
            </span>
            <span className="tnum font-sans text-2xl leading-tight font-semibold text-[var(--color-ink)]">
              {dayNumber}
            </span>
          </div>
        ),
      },
    ],
    [dateString, occurrences, weekdayLabel, dayNumber],
  )

  return (
    <TimeGrid
      columns={columns}
      onOpenEvent={onOpenEvent}
      onCreateRange={(_date, start, end) => onCreateRange(start, end)}
      className={className}
    />
  )
}
