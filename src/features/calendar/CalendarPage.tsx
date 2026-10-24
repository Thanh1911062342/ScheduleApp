/**
 * Màn hình chính — lịch tháng.
 *
 * Ghép thanh công cụ, lưới lịch, panel ngày và các popup. Cử chỉ (click /
 * ấn-giữ / kéo khoanh vùng) do `MonthGrid` xử lý; ở đây chỉ nối vào store.
 */

import { useEffect, useMemo } from 'react'

import { BulkCreatePopup } from '@/components/calendar/BulkCreatePopup'
import { DayPanel } from '@/components/calendar/DayPanel'
import { DayView } from '@/components/calendar/DayView'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { RecurrenceScopeDialog } from '@/components/calendar/RecurrenceScopeDialog'
import { SearchOverlay } from '@/components/calendar/SearchOverlay'
import { TopBar } from '@/components/calendar/TopBar'
import { WeekView } from '@/components/calendar/WeekView'
import { EventForm } from '@/components/event/EventForm'
import { Button } from '@/components/ui/Button'
import {
  monthGridRange,
  monthRange,
  normalizeRange,
  toDateString,
  weekDays,
} from '@/lib/date'
import { useCalendars, useOccurrences, useOccurrencesByDate } from '@/lib/hooks'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi } from '@/stores/calendarUiStore'

export function CalendarPage() {
  const user = useAuthStore((s) => s.user)
  const {
    cursor,
    view,
    hiddenCalendarIds,
    selectedDate,
    draft,
    selection,
    openDay,
    closeDay,
    closeDraft,
    openEdit,
    openCreate,
    setSelection,
    setSearchOpen,
    syncCalendars,
  } = useCalendarUi()

  const calendarsQuery = useCalendars()
  const calendars = calendarsQuery.data ?? []

  // Đồng bộ lịch ẩn từ server một lần khi tải xong.
  useEffect(() => {
    if (calendars.length > 0) syncCalendars(calendars)
  }, [calendars, syncCalendars])

  const weekStart = user?.week_start ?? 1

  /**
   * Khoảng ngày cần tải.
   *
   * Với lưới tháng, phải lấy rộng hơn tháng một chút để các ngày đệm của tháng
   * kề cũng có dữ liệu — nếu không, ô cuối tháng sẽ trống trơn.
   */
  const dateWindow = useMemo(() => {
    if (view === 'month') return monthGridRange(cursor, weekStart)
    if (view === 'week') {
      const days = weekDays(cursor, weekStart)
      return { start: days[0], end: days[days.length - 1] }
    }
    const { start, end } = monthRange(cursor)
    void start
    void end
    return { start: cursor, end: cursor }
  }, [view, cursor, weekStart])

  const query = useMemo(() => {
    const visibleIds = calendars
      .filter((c) => !hiddenCalendarIds.has(c.id))
      .map((c) => c.id)
    return {
      start: toDateString(dateWindow.start),
      end: toDateString(dateWindow.end),
      calendarIds: calendars.length > 0 ? visibleIds : undefined,
    }
  }, [window, calendars, hiddenCalendarIds])

  const occurrencesQuery = useOccurrences(query, calendars.length > 0)
  const occurrencesByDate = useOccurrencesByDate(
    occurrencesQuery.data,
    dateWindow.start,
    dateWindow.end,
  )

  // Tắt panel ngày khi đổi chế độ xem hoặc đổi tháng cho khỏi rối.
  useEffect(() => {
    closeDay()
  }, [view, cursor, closeDay])

  // Phím tắt Ctrl+K / Cmd+K để mở tìm kiếm.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSearchOpen])

  // Phím tắt Ctrl+N để tạo lịch cho ngày đang xem.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openCreate(toDateString(cursor))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cursor, openCreate])

  const selectedOccurrences = selectedDate ? occurrencesByDate.get(selectedDate) ?? [] : []

  // Vùng chọn đang chờ mở popup tạo hàng loạt.
  const normalizedSelection = selection ? normalizeRange(
    new Date(`${selection.start}T00:00:00`),
    new Date(`${selection.end}T00:00:00`),
  ) : null

  function handleSelectRange(startDate: string, endDate: string) {
    // Một ô đơn lẻ thì coi như click thường, không mở popup hàng loạt.
    if (startDate === endDate) {
      openDay(startDate)
      return
    }
    setSelection({ start: startDate, end: endDate })
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-paper)]">
      <TopBar calendars={calendars} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col">
          {calendarsQuery.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <p className="text-mini text-[var(--color-danger)]">
                {String(calendarsQuery.error)}
              </p>
              <Button variant="secondary" onClick={() => void calendarsQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : view === 'month' ? (
            <MonthGrid
              cursor={cursor}
              weekStart={weekStart}
              occurrencesByDate={occurrencesByDate}
              hiddenCalendarIds={hiddenCalendarIds}
              selectedDate={selectedDate}
              selection={selection}
              onLongPress={openCreate}
              onTap={openDay}
              onSelectRange={handleSelectRange}
            />
          ) : view === 'week' ? (
            <WeekView
              cursor={cursor}
              weekStart={weekStart}
              occurrencesByDate={occurrencesByDate}
              onOpenDay={openDay}
              onOpenEvent={openEdit}
              onAddForDay={openCreate}
            />
          ) : (
            <DayView
              cursor={cursor}
              occurrencesByDate={occurrencesByDate}
              onOpenEvent={openEdit}
              onAddForDay={openCreate}
            />
          )}
        </main>

        {selectedDate ? (
          <DayPanel
            dateString={selectedDate}
            occurrences={selectedOccurrences}
            onClose={closeDay}
          />
        ) : null}
      </div>

      {/* Popup tạo / sửa sự kiện */}
      {draft ? (
        <EventForm draft={draft} calendars={calendars} onClose={closeDraft} />
      ) : null}

      {/* Popup tạo hàng loạt sau khi khoanh vùng */}
      {normalizedSelection && calendars.length > 0 ? (
        <BulkCreatePopup
          selection={{
            start: toDateString(normalizedSelection.start),
            end: toDateString(normalizedSelection.end),
          }}
          calendars={calendars}
          onClose={() => setSelection(null)}
        />
      ) : null}

      <RecurrenceScopeDialog />
      <SearchOverlay />
    </div>
  )
}