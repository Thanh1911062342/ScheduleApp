/**
 * Màn hình chính — lịch tháng.
 *
 * Ghép thanh công cụ, lưới lịch, panel ngày và các popup. Cử chỉ (click /
 * ấn-giữ / kéo khoanh vùng) do `MonthGrid` xử lý; ở đây chỉ nối vào store.
 */

import { useEffect, useMemo } from 'react'
import { addDays, differenceInCalendarDays } from 'date-fns'
import { useTranslation } from 'react-i18next'

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
  formatFullDate,
  fromDateString,
  monthGridRange,
  monthRange,
  normalizeRange,
  timeToMinutes,
  toDateString,
  toTimeString,
  weekDays,
} from '@/lib/date'
import { translateApiError } from '@/lib/errors'
import { eventsApi } from '@/lib/api'
import { useCalendars, useOccurrences, useOccurrencesByDate } from '@/lib/hooks'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { Occurrence, TimeString } from '@/types'
import { useQueryClient } from '@tanstack/react-query'

/** Số phút trong ngày -> chuỗi giờ `HH:mm:00` gửi lên backend. */
function minutesToTimeString(minutes: number): TimeString {
  const clamped = Math.min(24 * 60 - 1, Math.max(0, minutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return toTimeString(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
}

export function CalendarPage() {
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const queryClient = useQueryClient()
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
    openCreateRange,
    setSelection,
    setSearchOpen,
    syncCalendars,
    pushToast,
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
  }, [dateWindow, calendars, hiddenCalendarIds])

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

  /**
   * Sao chép sự kiện sang ngày/giờ khác — kích hoạt bằng Ctrl + giữ chuột
   * phải rồi kéo khối sự kiện trên timeline tới vị trí đích (bất kỳ cột
   * ngày nào, bất kỳ khung giờ nào, bám nấc 30 phút).
   *
   * Lấy chi tiết sự kiện gốc (để chép cả checklist), giữ nguyên thời lượng,
   * dịch ngày/giờ bắt đầu theo chỗ thả rồi tạo bản mới.
   */
  async function handleCopyEventTo(
    occurrence: Occurrence,
    targetDate: string,
    startMinutes: number | null,
  ) {
    const dayDelta = differenceInCalendarDays(
      fromDateString(targetDate),
      fromDateString(occurrence.occurrence_date),
    )
    try {
      const source = await eventsApi.get(occurrence.event_id)
      const startDate = toDateString(addDays(fromDateString(source.start_date), dayDelta))
      const endDate = toDateString(addDays(fromDateString(source.end_date), dayDelta))

      // Sự kiện có giờ + đích có giờ cụ thể: dịch giờ bắt đầu, giữ thời lượng.
      let startTime = source.start_time
      let endTime = source.end_time
      if (!source.is_all_day && startMinutes != null && source.start_time) {
        const sourceStart = timeToMinutes(source.start_time) ?? 0
        const sourceEnd = timeToMinutes(source.end_time) ?? sourceStart + 60
        const newStart = startMinutes
        const newEnd = newStart + Math.max(30, sourceEnd - sourceStart)
        startTime = minutesToTimeString(newStart)
        endTime = minutesToTimeString(newEnd)
      }

      await eventsApi.create({
        title: source.title,
        start_date: startDate,
        end_date: endDate,
        is_all_day: source.is_all_day,
        start_time: startTime,
        end_time: endTime,
        calendar_id: source.calendar_id,
        description: source.description,
        location: source.location,
        color: source.color,
        checklist: source.checklist.map((item) => item.content),
      })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      pushToast({
        messageKey: 'event.copied',
        params: { date: formatFullDate(targetDate) },
      })
    } catch (err) {
      pushToast({ messageKey: translateApiError(err, t), tone: 'danger' })
    }
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
              onCreateRange={openCreateRange}
              onCopyEventTo={handleCopyEventTo}
            />
          ) : (
            <DayView
              cursor={cursor}
              occurrencesByDate={occurrencesByDate}
              onOpenEvent={openEdit}
              onAddForDay={openCreate}
              onCreateRange={openCreateRange}
              onCopyEventTo={handleCopyEventTo}
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