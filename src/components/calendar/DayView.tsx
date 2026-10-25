/**
 * Chế độ xem Ngày — timeline theo giờ (giống Google Calendar).
 *
 * Sự kiện cả ngày nằm ở dải riêng phía trên, sự kiện có giờ hiện thành khối
 * đặt đúng vị trí trên lưới 24 giờ.
 */

import { DayTimeline } from '@/components/calendar/DayTimeline'
import { toDateString } from '@/lib/date'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { Occurrence } from '@/types'

interface DayViewProps {
  cursor: Date
  occurrencesByDate: Map<string, Occurrence[]>
  onOpenEvent: (occurrence: Occurrence) => void
  onAddForDay: (date: string) => void
  /** Mở form tạo lịch cho khoảng giờ đã bấm/kéo trên timeline. */
  onCreateRange?: (date: string, startMinutes: number, endMinutes: number) => void
  /** Ctrl + chuột phải kéo khối sự kiện sang ngày khác -> sao chép. */
  onCopyEventTo?: (occurrence: Occurrence, targetDateString: string) => void
}

export function DayView({
  cursor,
  occurrencesByDate,
  onOpenEvent,
  onCreateRange,
  onCopyEventTo,
}: DayViewProps) {
  const dateString = toDateString(cursor)
  const items = occurrencesByDate.get(dateString) ?? []
  const weekStart = useAuthStore((s) => s.user?.week_start ?? 1)
  const zoom = useCalendarUi((s) => s.timelineZoom.day)
  const setTimelineZoom = useCalendarUi((s) => s.setTimelineZoom)

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-hidden">
      <DayTimeline
        dateString={dateString}
        occurrences={items}
        onOpenEvent={onOpenEvent}
        onCreateRange={
          onCreateRange ? (start, end) => onCreateRange(dateString, start, end) : () => {}
        }
        zoom={zoom}
        onZoomChange={(z) => setTimelineZoom('day', z)}
        onCopyEventTo={onCopyEventTo}
        weekStart={weekStart}
        className="min-h-0 w-full max-w-2xl border-x border-[var(--color-rule)]"
      />
    </div>
  )
}
