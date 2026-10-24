/**
 * Một ô ngày trong lưới tháng.
 *
 * Ô này KHÔNG tự gắn sự kiện pointer — lưới cha xử lý cử chỉ (xem
 * `useGridGesture`). Ở đây chỉ hiển thị và mang thuộc tính `data-date` để
 * lưới tra ra ngày đang được trỏ tới.
 */

import { memo } from 'react'

import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/date'
import type { Occurrence } from '@/types'

const MAX_CHIPS = 3

export interface DayCellProps {
  dateString: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  occurrences: Occurrence[]
  isSelected: boolean
  isInSelection: boolean
  isPressed: boolean
  /** Đang ghim làm điểm neo của vùng chọn. */
  isAnchor: boolean
}

function DayCellImpl({
  dateString,
  dayNumber,
  isCurrentMonth,
  isToday,
  isWeekend,
  occurrences,
  isSelected,
  isInSelection,
  isPressed,
  isAnchor,
}: DayCellProps) {
  const visible = occurrences.slice(0, MAX_CHIPS)
  const overflow = occurrences.length - visible.length

  return (
    <div
      data-date={dateString}
      className={cn(
        'no-select relative flex flex-col gap-1 border-b border-r border-[var(--color-rule)]',
        'h-[52px] p-1 sm:h-[90px] lg:h-[110px]',
        'transition-colors duration-150',
        isCurrentMonth
          ? 'bg-[var(--color-paper-raised)]'
          : 'bg-[var(--color-paper-sunken)] text-[var(--color-ink-faint)]',
        isWeekend && isCurrentMonth && 'bg-[color-mix(in_srgb,var(--color-paper-sunken)_55%,transparent)]',
        isInSelection && 'bg-[var(--color-accent-soft)]',
        isPressed && 'animate-press',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'tnum flex h-5 w-5 items-center justify-center rounded-full text-mini leading-none',
            isToday && 'bg-[var(--color-ink)] font-semibold text-[var(--color-paper)]',
            !isToday && isCurrentMonth && 'text-[var(--color-ink)]',
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* PC và tablet: hiện chip chữ */}
      <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        {visible.map((occ) => (
          <EventChip key={occ.occurrence_key} occurrence={occ} />
        ))}
        {overflow > 0 ? (
          <span className="px-1 text-micro text-[var(--color-ink-faint)]">+{overflow}</span>
        ) : null}
      </div>

      {/* Mobile: ô nhỏ nên chỉ hiện chấm màu */}
      <div className="flex flex-wrap content-start gap-0.5 sm:hidden">
        {occurrences.slice(0, 4).map((occ) => (
          <span
            key={occ.occurrence_key}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: occ.color ?? occ.calendar.color }}
          />
        ))}
        {occurrences.length > 4 ? (
          <span className="text-[8px] leading-none text-[var(--color-ink-faint)]">
            +{occurrences.length - 4}
          </span>
        ) : null}
      </div>

      {isSelected ? (
        <span className="pointer-events-none absolute inset-0 border-2 border-[var(--color-ink)]" />
      ) : null}
      {isAnchor ? (
        <span className="pointer-events-none absolute inset-0 border border-dashed border-[var(--color-accent)]" />
      ) : null}
    </div>
  )
}

function EventChip({ occurrence }: { occurrence: Occurrence }) {
  const color = occurrence.color ?? occurrence.calendar.color
  const done = occurrence.status === 'done'

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-[4px] px-1 py-[1px] text-micro leading-tight',
        done && 'opacity-50',
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <span
        className="h-full w-[2px] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: color }}
      />
      {!occurrence.is_all_day && occurrence.start_time ? (
        <span className="tnum shrink-0 text-[var(--color-ink-soft)]">
          {formatTime(occurrence.start_time)}
        </span>
      ) : null}
      <span
        className={cn(
          'truncate text-[var(--color-ink)]',
          done && 'line-through',
        )}
      >
        {occurrence.title}
      </span>
      {occurrence.checklist_total > 0 ? (
        <span className="tnum shrink-0 text-[var(--color-ink-faint)]">
          {occurrence.checklist_done}/{occurrence.checklist_total}
        </span>
      ) : null}
    </span>
  )
}

export const DayCell = memo(DayCellImpl)