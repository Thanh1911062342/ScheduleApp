/**
 * Panel chi tiết ngày.
 *
 * PC: cột bên phải. Mobile: bottom sheet. Dùng chung component, chỉ khác
 * layout qua breakpoint.
 */

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { formatFullDate, formatTime } from '@/lib/date'
import { useUpdateEvent } from '@/lib/hooks'
import { useCalendarUi } from '@/stores/calendarUiStore'
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
  const updateEvent = useUpdateEvent()

  // Nhóm theo lịch con để dễ nhìn khi có nhiều lịch.
  const grouped = new Map<string, { name: string; color: string; items: Occurrence[] }>()
  for (const occ of occurrences) {
    const entry = grouped.get(occ.calendar.id)
    if (entry) {
      entry.items.push(occ)
    } else {
      grouped.set(occ.calendar.id, {
        name: occ.calendar.name,
        color: occ.calendar.color,
        items: [occ],
      })
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-[var(--color-rule)] bg-[var(--color-paper)]',
        // Mobile: bottom sheet cố định.
        'fixed inset-x-0 bottom-0 z-40 max-h-[75vh] animate-sheet-up rounded-t-2xl border-t',
        // PC: cột bên phải.
        'lg:static lg:z-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:animate-fade-in lg:rounded-none lg:border-t-0 lg:border-l',
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-rule)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-sm font-semibold text-[var(--color-ink)]">
            {formatFullDate(dateString)}
          </h2>
          <p className="tnum text-micro text-[var(--color-ink-faint)]">
            {t('day.eventCount', { count: occurrences.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="shrink-0 rounded p-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-3 py-3">
        {occurrences.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-mini text-[var(--color-ink-faint)]">{t('day.noEvents')}</p>
            <p className="text-micro text-[var(--color-ink-faint)]">{t('day.hintHold')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {[...grouped.entries()].map(([calendarId, group]) => (
              <section key={calendarId} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 px-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-micro font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                    {group.name}
                  </span>
                </div>

                {group.items.map((occ) => (
                  <OccurrenceRow
                    key={occ.occurrence_key}
                    occurrence={occ}
                    onOpen={() => openEdit(occ)}
                    onToggleDone={(status) =>
                      void updateEvent.mutateAsync({
                        id: occ.event_id,
                        payload: { status },
                        // Sự kiện lặp: chỉ đổi trạng thái cho lần này.
                        scope: occ.is_recurring ? 'this' : 'all',
                        occurrenceDate: occ.is_recurring ? occ.occurrence_date : undefined,
                      })
                    }
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--color-rule)] px-3 py-2.5">
        <Button variant="secondary" className="w-full justify-center" onClick={() => openCreate(dateString)}>
          {t('day.addForDay')}
        </Button>
      </footer>
    </aside>
  )
}

function OccurrenceRow({
  occurrence,
  onOpen,
  onToggleDone,
}: {
  occurrence: Occurrence
  onOpen: () => void
  onToggleDone: (status: 'done' | 'confirmed') => void
}) {
  const { t } = useTranslation()
  const color = occurrence.color ?? occurrence.calendar.color
  const isDone = occurrence.status === 'done'

  return (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-[var(--radius-note)] border border-transparent px-1.5 py-1.5',
        'transition-colors hover:border-[var(--color-rule)] hover:bg-[var(--color-paper-sunken)]',
      )}
    >
      {/* Đánh dấu xong nhanh */}
      <Checkbox
        checked={isDone}
        onChange={(checked) => onToggleDone(checked ? 'done' : 'confirmed')}
        className="mt-0.5"
      />

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span
            className={cn(
              'truncate text-mini font-medium text-[var(--color-ink)]',
              isDone && 'text-[var(--color-ink-faint)] line-through',
            )}
          >
            {occurrence.title}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2 pl-[9px]">
          <span className="tnum text-micro text-[var(--color-ink-soft)]">
            {occurrence.is_all_day ? t('event.allDay') : formatTime(occurrence.start_time)}
          </span>
          {occurrence.location ? (
            <span className="truncate text-micro text-[var(--color-ink-faint)]">
              {occurrence.location}
            </span>
          ) : null}
          {occurrence.is_recurring ? (
            <span className="shrink-0 text-micro text-[var(--color-ink-faint)]" title={t('event.recurrence')}>
              ↻
            </span>
          ) : null}
        </span>
      </button>

      {occurrence.checklist_total > 0 ? (
        <ChecklistBadge occurrence={occurrence} />
      ) : null}
    </div>
  )
}

/**
 * Huy hiệu tiến độ checklist.
 *
 * Chỉ hiện con số. Việc tick từng mục nằm trong form chi tiết vì cần gọi API
 * riêng cho từng mục và panel này không đủ chỗ.
 */
function ChecklistBadge({ occurrence }: { occurrence: Occurrence }) {
  return (
    <span className="tnum shrink-0 rounded-full border border-[var(--color-rule-strong)] px-1.5 py-0.5 text-micro text-[var(--color-ink-soft)]">
      {occurrence.checklist_done}/{occurrence.checklist_total}
    </span>
  )
}