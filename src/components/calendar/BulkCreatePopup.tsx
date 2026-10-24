/**
 * Popup tạo lịch cho một khoảng ngày — mở sau khi người dùng kéo khoanh vùng.
 *
 * Hai chế độ, người dùng tự chọn:
 *  - "Mỗi ngày một lịch" (mặc định): N bản ghi rời, sửa/xoá/tick độc lập.
 *    Đúng cho use case "lên lịch cho cả tuần sau".
 *  - "Một lịch dài cả khoảng": một bản ghi trải từ ngày đầu đến ngày cuối.
 *    Đúng cho "đi công tác 24–30/10".
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Field, Input, Radio, Switch } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { countDaysInRange, daysBetween, formatRangeLabel, toDateString } from '@/lib/date'
import { translateApiError } from '@/lib/errors'
import { useCreateEventsBulk } from '@/lib/hooks'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { BulkMode, Calendar, DateString } from '@/types'

interface BulkCreatePopupProps {
  selection: { start: DateString; end: DateString }
  calendars: Calendar[]
  onClose: () => void
}

export function BulkCreatePopup({ selection, calendars, onClose }: BulkCreatePopupProps) {
  const { t } = useTranslation()
  const pushToast = useCalendarUi((s) => s.pushToast)
  const clearSelection = useCalendarUi((s) => s.setSelection)
  const createBulk = useCreateEventsBulk()

  const start = new Date(`${selection.start}T00:00:00`)
  const end = new Date(`${selection.end}T00:00:00`)

  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<BulkMode>('per_day')
  const [skipWeekends, setSkipWeekends] = useState(false)
  const [isAllDay, setIsAllDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [error, setError] = useState<string | null>(null)

  const defaultCalendarId = useMemo(
    () => calendars.find((c) => c.is_default)?.id ?? calendars[0]?.id ?? '',
    [calendars],
  )
  const [calendarId, setCalendarId] = useState(defaultCalendarId)

  // Với chế độ "một lịch dài", bỏ cuối tuần không có nghĩa -> luôn tạo 1 mục.
  const dayCount = countDaysInRange(start, end, skipWeekends)
  const willCreate = mode === 'span' ? 1 : dayCount
  const totalDays = daysBetween(start, end).length

  function handleClose() {
    clearSelection(null)
    onClose()
  }

  async function handleSubmit() {
    setError(null)
    if (!title.trim()) {
      setError(t('validation.titleRequired'))
      return
    }
    if (mode === 'per_day' && dayCount === 0) {
      setError(t('bulk.noDays'))
      return
    }

    try {
      const created = await createBulk.mutateAsync({
        title: title.trim(),
        start_date: toDateString(start),
        end_date: toDateString(end),
        mode,
        skip_weekends: skipWeekends,
        is_all_day: isAllDay,
        start_time: isAllDay ? null : `${startTime}:00`,
        end_time: isAllDay ? null : `${endTime}:00`,
        calendar_id: calendarId || null,
      })
      pushToast({ messageKey: 'event.createdCount', params: { count: created.length } })
      handleClose()
    } catch (err) {
      setError(translateApiError(err, t))
    }
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title={t('bulk.title')}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-mini text-[var(--color-ink-faint)]">
            {t('bulk.willCreate', { count: willCreate })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={createBulk.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSubmit()}
              disabled={createBulk.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Khoảng đã chọn */}
        <div className="rounded-[var(--radius-note)] border border-[var(--color-rule)] bg-[var(--color-paper-sunken)] px-3 py-2">
          <p className="text-micro text-[var(--color-ink-faint)]">{t('bulk.rangeLabel')}</p>
          <p className="tnum text-sm font-medium text-[var(--color-ink)]">
            {formatRangeLabel(start, end)}
          </p>
          <p className="text-micro text-[var(--color-ink-faint)]">
            {t('bulk.dayCount', { count: totalDays })}
          </p>
        </div>

        <Field label={t('event.titlePlaceholder')}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            placeholder={t('event.titlePlaceholder')}
            autoFocus
          />
        </Field>

        {/* Chế độ áp dụng */}
        <Field label={t('bulk.modeLabel')}>
          <div className="flex flex-col gap-2">
            <ModeOption
              active={mode === 'per_day'}
              onSelect={() => setMode('per_day')}
              title={t('bulk.modePerDay')}
              hint={t('bulk.modePerDayHint')}
            />
            <ModeOption
              active={mode === 'span'}
              onSelect={() => setMode('span')}
              title={t('bulk.modeSpan')}
              hint={t('bulk.modeSpanHint')}
            />
          </div>
        </Field>

        {/* Bỏ cuối tuần — chỉ có nghĩa ở chế độ mỗi ngày một lịch */}
        {mode === 'per_day' ? (
          <div className="flex flex-col gap-1">
            <Switch
              checked={skipWeekends}
              onChange={setSkipWeekends}
              label={t('bulk.skipWeekends')}
            />
            <p className="pl-11 text-micro text-[var(--color-ink-faint)]">
              {t('bulk.skipWeekendsHint')}
            </p>
            {dayCount === 0 ? (
              <p className="pl-11 text-micro text-[var(--color-danger)]">{t('bulk.noDays')}</p>
            ) : null}
          </div>
        ) : null}

        {/* Giờ */}
        <div className="flex flex-col gap-2">
          <Switch checked={isAllDay} onChange={setIsAllDay} label={t('event.allDay')} />
          {!isAllDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('event.startTime')}>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>
              <Field label={t('event.endTime')}>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>

        {/* Lịch con */}
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

        {error ? (
          <div className="rounded-[var(--radius-note)] border border-[var(--color-danger)] px-3 py-2 text-mini text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function ModeOption({
  active,
  onSelect,
  title,
  hint,
}: {
  active: boolean
  onSelect: () => void
  title: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-note)] border px-3 py-2 text-left transition-colors',
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-rule-strong)] hover:bg-[var(--color-paper-sunken)]',
      )}
    >
      <Radio checked={active} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-mini font-medium text-[var(--color-ink)]">{title}</span>
        <span className="block text-micro text-[var(--color-ink-faint)]">{hint}</span>
      </span>
    </button>
  )
}