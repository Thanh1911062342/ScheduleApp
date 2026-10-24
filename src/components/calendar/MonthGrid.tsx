/**
 * Lưới tháng — màn hình chính.
 *
 * Cử chỉ (click / ấn-giữ / kéo chọn vùng) do `useGridGesture` xử lý ở cấp lưới,
 * không phải ở từng ô. Lý do: máy trạng thái cần theo dõi pointer xuyên nhiều ô
 * khi kéo, và chỉ lưới mới biết ô đang trỏ tới qua `data-date`.
 */

import { useTranslation } from 'react-i18next'

import { DayCell } from '@/components/calendar/DayCell'
import { cn } from '@/lib/cn'
import { monthGridDays, toDateString, weekdayLabels } from '@/lib/date'
import { useGridGesture } from '@/lib/useGridGesture'
import type { Occurrence } from '@/types'

interface MonthGridProps {
  cursor: Date
  weekStart: number
  occurrencesByDate: Map<string, Occurrence[]>
  hiddenCalendarIds: Set<string>
  /** Ngày đang mở ở panel chi tiết. */
  selectedDate: string | null
  /** Vùng đã khoanh (đang chờ mở popup tạo hàng loạt). */
  selection: { start: string; end: string } | null
  onLongPress: (date: string) => void
  onTap: (date: string) => void
  onSelectRange: (start: string, end: string) => void
}

export function MonthGrid({
  cursor,
  weekStart,
  occurrencesByDate,
  hiddenCalendarIds,
  selectedDate,
  selection,
  onLongPress,
  onTap,
  onSelectRange,
}: MonthGridProps) {
  const { t } = useTranslation()
  const days = monthGridDays(cursor, weekStart)
  const labels = weekdayLabels(weekStart)

  const { state, gridProps } = useGridGesture({ onLongPress, onTap, onSelectRange })

  const today = toDateString(new Date())
  const currentMonth = cursor.getMonth()

  // Vùng đang khoanh trong lúc kéo (chưa nhả chuột).
  const liveSelection =
    state.phase === 'selecting' && state.anchorDate && state.hoverDate
      ? {
          start: state.anchorDate < state.hoverDate ? state.anchorDate : state.hoverDate,
          end: state.anchorDate < state.hoverDate ? state.hoverDate : state.anchorDate,
        }
      : selection

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-[var(--color-rule)]">
        {labels.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="py-1.5 text-center text-micro font-medium tracking-wide text-[var(--color-ink-faint)] uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      {/* `touch-none-grid`: thiếu class này thì kéo chọn vùng trên mobile sẽ
          cuộn trang và sự kiện pointermove bị trình duyệt nuốt. */}
      <div
        className="touch-none-grid grid min-h-0 flex-1 grid-cols-7 border-l border-t border-[var(--color-rule)]"
        {...gridProps}
      >
        {days.map((day) => {
          const dateString = toDateString(day)
          const all = occurrencesByDate.get(dateString) ?? []
          const visible = all.filter((occ) => !hiddenCalendarIds.has(occ.calendar.id))

          const inSelection = liveSelection
            ? dateString >= liveSelection.start && dateString <= liveSelection.end
            : false

          return (
            <DayCell
              key={dateString}
              dateString={dateString}
              dayNumber={day.getDate()}
              isCurrentMonth={day.getMonth() === currentMonth}
              isToday={dateString === today}
              isWeekend={day.getDay() === 0 || day.getDay() === 6}
              occurrences={visible}
              isSelected={selectedDate === dateString}
              isInSelection={inSelection}
              isPressed={state.pressedDate === dateString}
              isAnchor={state.anchorDate === dateString && state.phase === 'selecting'}
            />
          )
        })}
      </div>

      {/* Gợi ý cử chỉ — chỉ hiện trên mobile, nơi cử chỉ không tự hiển nhiên. */}
      <p
        className={cn(
          'shrink-0 border-t border-[var(--color-rule)] px-3 py-1.5 text-center text-micro text-[var(--color-ink-faint)] lg:hidden',
        )}
      >
        {t('day.hintClick')} · {t('day.hintHold')} · {t('day.hintDrag')}
      </p>
    </div>
  )
}