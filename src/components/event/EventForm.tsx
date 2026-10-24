/**
 * Form tạo / sửa sự kiện.
 *
 * Mở khi ấn-giữ một ô ngày, hoặc khi bấm nút "+". Trên PC hiện dialog giữa
 * màn hình; trên mobile hiện bottom sheet (do `Modal` tự chuyển).
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChecklistEditor } from '@/components/event/ChecklistEditor'
import {
  RecurrenceField,
  fromRecurrencePayload,
  toRecurrencePayload,
  type RecurrenceValue,
} from '@/components/event/RecurrenceField'
import { Button } from '@/components/ui/Button'
import { Checkbox, ColorSwatches, Field, Input, SegmentedControl, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ApiRequestError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fromDateString, toTimeInputValue, toTimeString } from '@/lib/date'
import { translateApiError } from '@/lib/errors'
import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateChecklistItem,
  useUpdateEvent,
} from '@/lib/hooks'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi, type EventDraft } from '@/stores/calendarUiStore'
import type { Calendar, EventStatus, RecurrenceScope } from '@/types'

const CALENDAR_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#78716C',
]

interface EventFormProps {
  draft: EventDraft
  calendars: Calendar[]
  onClose: () => void
}

export function EventForm({ draft, calendars, onClose }: EventFormProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const pushToast = useCalendarUi((s) => s.pushToast)
  const askScope = useCalendarUi((s) => s.askScope)

  const editing = draft.editing
  const isEditing = Boolean(editing)

  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [location, setLocation] = useState(editing?.location ?? '')
  const [isAllDay, setIsAllDay] = useState(draft.isAllDay)
  const [startDate, setStartDate] = useState(draft.startDate)
  const [endDate, setEndDate] = useState(draft.endDate)
  const [startTime, setStartTime] = useState(draft.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(draft.endTime ?? '10:00')
  const [color, setColor] = useState<string | null>(editing?.color ?? null)
  const [status, setStatus] = useState<EventStatus>(editing?.status ?? 'confirmed')

  const defaultCalendarId = useMemo(
    () => calendars.find((c) => c.is_default)?.id ?? calendars[0]?.id ?? '',
    [calendars],
  )
  const [calendarId, setCalendarId] = useState(editing?.calendar.id ?? defaultCalendarId)

  const [recurrence, setRecurrence] = useState<RecurrenceValue>(() =>
    fromRecurrencePayload(null),
  )

  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const updateChecklistItem = useUpdateChecklistItem()

  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending

  // Đồng bộ khi popup mở cho ngày khác mà không bị unmount.
  useEffect(() => {
    setStartDate(draft.startDate)
    setEndDate(draft.endDate)
    setIsAllDay(draft.isAllDay)
  }, [draft.startDate, draft.endDate, draft.isAllDay])

  const weekStart = user?.week_start ?? 1
  const startDateObj = fromDateString(startDate)

  async function handleSubmit() {
    setError(null)
    setFieldError(null)

    if (!title.trim()) {
      setFieldError(t('validation.titleRequired'))
      return
    }
    if (endDate < startDate) {
      setError(t('errors.event.invalid_date_range'))
      return
    }

    const times = isAllDay
      ? { start_time: null, end_time: null }
      : { start_time: toTimeString(startTime), end_time: toTimeString(endTime) }

    try {
      if (isEditing && editing) {
        // Sự kiện lặp thì phải hỏi phạm vi trước khi gửi.
        let scope: RecurrenceScope = 'all'
        let occurrenceDate: string | undefined
        if (editing.is_recurring) {
          const answer = await askScope('edit', editing)
          if (answer === null) return // user huỷ
          scope = answer
          occurrenceDate = editing.occurrence_date
        }

        await updateEvent.mutateAsync({
          id: editing.event_id,
          scope,
          occurrenceDate,
          payload: {
            title: title.trim(),
            description: description.trim() || null,
            location: location.trim() || null,
            is_all_day: isAllDay,
            start_date: startDate,
            end_date: isAllDay ? endDate : endDate,
            ...times,
            calendar_id: calendarId,
            color,
            status,
            recurrence: toRecurrencePayload(recurrence),
          },
        })
        pushToast({ messageKey: 'event.updated' })
      } else {
        await createEvent.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          is_all_day: isAllDay,
          start_date: startDate,
          end_date: endDate,
          ...times,
          calendar_id: calendarId,
          color,
          recurrence: toRecurrencePayload(recurrence),
        })
        pushToast({ messageKey: 'event.created' })
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'event.invalid_time_range') {
        setError(t('errors.event.invalid_time_range'))
      } else {
        setError(translateApiError(err, t))
      }
    }
  }

  async function handleDelete() {
    if (!editing) return

    let scope: RecurrenceScope = 'all'
    let occurrenceDate: string | undefined
    if (editing.is_recurring) {
      const answer = await askScope('delete', editing)
      if (answer === null) return
      scope = answer
      occurrenceDate = editing.occurrence_date
    }

    try {
      await deleteEvent.mutateAsync({
        id: editing.event_id,
        scope,
        occurrenceDate,
      })
      pushToast({ messageKey: 'event.deleted' })
      onClose()
    } catch (err) {
      setError(translateApiError(err, t))
    }
  }

  const activeCalendar = calendars.find((c) => c.id === calendarId)

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEditing ? t('event.editTitle') : t('event.newTitle')}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <Button variant="danger" onClick={() => void handleDelete()} disabled={busy}>
              {t('common.delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSubmit()} disabled={busy}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tiêu đề */}
        <div className="flex items-start gap-2">
          <span
            className="mt-2 h-5 w-[3px] shrink-0 rounded-full"
            style={{ backgroundColor: color ?? activeCalendar?.color ?? '#3B82F6' }}
          />
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setFieldError(null)
              }}
              placeholder={t('event.titlePlaceholder')}
              autoFocus
              className={cn(
                'border-0 border-b border-[var(--color-rule)] bg-transparent px-0 py-1',
                'font-serif text-lg font-medium focus:border-[var(--color-accent)]',
              )}
            />
            {fieldError ? (
              <p className="mt-1 text-micro text-[var(--color-danger)]">{fieldError}</p>
            ) : null}
          </div>
        </div>

        {/* Cả ngày */}
        <Switch
          checked={isAllDay}
          onChange={setIsAllDay}
          label={t('event.allDay')}
        />

        {/* Ngày + giờ */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('event.startDate')}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                // Ngày kết thúc không được đứng trước ngày bắt đầu.
                if (e.target.value > endDate) setEndDate(e.target.value)
              }}
            />
          </Field>

          <Field label={t('event.endDate')}>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>

          {!isAllDay ? (
            <>
              <Field label={t('event.startTime')}>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>
              <Field label={t('event.endTime')}>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </Field>
            </>
          ) : null}
        </div>

        {/* Lịch con + màu */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('event.calendar')}>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full cursor-pointer rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] px-2.5 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            >
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('event.color')}>
            <ColorSwatches
              colors={CALENDAR_COLORS}
              value={color}
              onChange={setColor}
              allowDefault
            />
          </Field>
        </div>

        {/* Địa điểm */}
        <Field label={t('event.location')}>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('event.locationPlaceholder')}
          />
        </Field>

        {/* Ghi chú */}
        <Field label={t('event.description')}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('event.descriptionPlaceholder')}
            rows={3}
          />
        </Field>

        {/* Lặp lại */}
        <div className="border-t border-[var(--color-rule)] pt-3">
          <RecurrenceField
            value={recurrence}
            onChange={setRecurrence}
            startDate={startDateObj}
            weekStart={weekStart}
          />
        </div>

        {/* Checklist — chỉ có khi đang sửa (cần event_id để gắn mục vào) */}
        {isEditing && editing ? (
          <div className="border-t border-[var(--color-rule)] pt-3">
            <ChecklistEditor
              eventId={editing.event_id}
              total={editing.checklist_total}
              done={editing.checklist_done}
              onToggle={async (itemId, isDone) => {
                await updateChecklistItem.mutateAsync({
                  itemId,
                  payload: { is_done: isDone },
                })
              }}
            />
          </div>
        ) : null}

        {/* Trạng thái — chỉ khi sửa */}
        {isEditing ? (
          <Field label={t('event.status')}>
            <SegmentedControl<EventStatus>
              value={status}
              onChange={setStatus}
              options={[
                { value: 'confirmed', label: t('event.statusConfirmed') },
                { value: 'done', label: t('event.statusDone') },
                { value: 'cancelled', label: t('event.statusCancelled') },
              ]}
            />
          </Field>
        ) : null}

        {error ? (
          <div className="rounded-[var(--radius-note)] border border-[var(--color-danger)] px-3 py-2 text-mini text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

/** Ô đánh dấu dùng chung — export để panel ngày tái sử dụng. */
export { Checkbox, toTimeInputValue }