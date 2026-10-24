/**
 * Trường chọn quy tắc lặp.
 *
 * Mặc định là "Không lặp" — user phải chủ động bật. Khi chọn Hàng tuần thì
 * hiện các nút chọn thứ; Hàng tháng thì chọn ngày trong tháng (hoặc ngày cuối).
 */

import { useTranslation } from 'react-i18next'

import { Field, Input, SegmentedControl, Select } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { Recurrence, RepeatFreq } from '@/types'

export type RepeatMode = 'NONE' | RepeatFreq
export type EndMode = 'never' | 'on' | 'after'

const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const

export interface RecurrenceValue {
  mode: RepeatMode
  weekdays: string[]
  monthday: number | null
  endMode: EndMode
  untilDate: string
  count: number
}

export const DEFAULT_RECURRENCE: RecurrenceValue = {
  mode: 'NONE',
  weekdays: [],
  monthday: null,
  endMode: 'never',
  untilDate: '',
  count: 10,
}

/** Chuyển state của form sang payload gửi API. `null` nghĩa là không lặp. */
export function toRecurrencePayload(value: RecurrenceValue): Recurrence | null {
  if (value.mode === 'NONE') return null

  return {
    freq: value.mode,
    interval: 1,
    by_weekday: value.mode === 'WEEKLY' && value.weekdays.length ? value.weekdays.join(',') : null,
    by_monthday: value.mode === 'MONTHLY' ? value.monthday : null,
    until_date: value.endMode === 'on' && value.untilDate ? value.untilDate : null,
    count: value.endMode === 'after' ? value.count : null,
  }
}

/** Khôi phục state form từ quy tắc lấy về từ API. */
export function fromRecurrencePayload(value: Recurrence | null | undefined): RecurrenceValue {
  if (!value) return { ...DEFAULT_RECURRENCE }

  return {
    mode: value.freq,
    weekdays: value.by_weekday ? value.by_weekday.split(',').filter(Boolean) : [],
    monthday: value.by_monthday,
    endMode: value.until_date ? 'on' : value.count ? 'after' : 'never',
    untilDate: value.until_date ?? '',
    count: value.count ?? 10,
  }
}

interface RecurrenceFieldProps {
  value: RecurrenceValue
  onChange: (value: RecurrenceValue) => void
  /** Ngày bắt đầu — dùng làm mặc định cho thứ / ngày trong tháng. */
  startDate: Date
  weekStart: number
}

export function RecurrenceField({ value, onChange, startDate, weekStart }: RecurrenceFieldProps) {
  const { t } = useTranslation()

  const patch = (partial: Partial<RecurrenceValue>) => {
    onChange({ ...value, ...partial })
  }

  // Thứ của ngày bắt đầu, quy về mã iCal. date-fns: T2 = 0.
  const startWeekdayCode = WEEKDAY_CODES[(startDate.getDay() + 6) % 7]
  const startMonthday = startDate.getDate()

  // Nhãn thứ đã xoay theo ngày bắt đầu tuần của user.
  const weekdayLabelsRaw = t('calendar.weekdaysShort', { returnObjects: true }) as string[]
  const weekdayLabels =
    Array.isArray(weekdayLabelsRaw) && weekdayLabelsRaw.length === 7
      ? weekdayLabelsRaw
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Thứ tự hiển thị khớp với lưới lịch.
  const orderedCodes =
    weekStart === 0 ? [WEEKDAY_CODES[6], ...WEEKDAY_CODES.slice(0, 6)] : [...WEEKDAY_CODES]

  function toggleWeekday(code: string) {
    const next = value.weekdays.includes(code)
      ? value.weekdays.filter((c) => c !== code)
      : [...value.weekdays, code]
    patch({ weekdays: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={t('event.recurrence')}>
        <SegmentedControl<RepeatMode>
          value={value.mode}
          onChange={(mode) =>
            patch({
              mode,
              // Chọn tuần mà chưa chọn thứ nào -> mặc định lấy thứ của ngày bắt đầu.
              weekdays:
                mode === 'WEEKLY' && value.weekdays.length === 0 ? [startWeekdayCode] : value.weekdays,
              monthday: mode === 'MONTHLY' && value.monthday === null ? startMonthday : value.monthday,
            })
          }
          className="flex-wrap"
          options={[
            { value: 'NONE', label: t('event.recurrenceNone') },
            { value: 'DAILY', label: t('event.recurrenceDaily') },
            { value: 'WEEKLY', label: t('event.recurrenceWeekly') },
            { value: 'MONTHLY', label: t('event.recurrenceMonthly') },
          ]}
        />
      </Field>

      {value.mode === 'WEEKLY' ? (
        <Field label={t('event.recurrenceWeeklyHint')}>
          <div className="flex flex-wrap gap-1">
            {orderedCodes.map((code, index) => {
              const active = value.weekdays.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(code)}
                  className={cn(
                    'h-7 min-w-[2rem] rounded-[6px] border px-1.5 text-mini font-medium transition-colors',
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-rule-strong)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunken)]',
                  )}
                >
                  {weekdayLabels[index]}
                </button>
              )
            })}
          </div>
        </Field>
      ) : null}

      {value.mode === 'MONTHLY' ? (
        <Field label={t('event.recurrenceMonthlyHint')}>
          <div className="flex items-center gap-2">
            <Select
              value={value.monthday === -1 ? 'last' : String(value.monthday ?? startMonthday)}
              onChange={(event) =>
                patch({ monthday: event.target.value === 'last' ? -1 : Number(event.target.value) })
              }
              className="w-40"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
              <option value="last">{t('event.recurrenceMonthlyLastDay')}</option>
            </Select>
          </div>
        </Field>
      ) : null}

      {value.mode !== 'NONE' ? (
        <Field label={t('event.recurrenceEnd')}>
          <div className="flex flex-col gap-2">
            <SegmentedControl<EndMode>
              value={value.endMode}
              onChange={(endMode) => patch({ endMode })}
              className="flex-wrap"
              options={[
                { value: 'never', label: t('event.recurrenceEndNever') },
                { value: 'on', label: t('event.recurrenceEndOn') },
                { value: 'after', label: t('event.recurrenceEndAfter') },
              ]}
            />

            {value.endMode === 'on' ? (
              <Input
                type="date"
                value={value.untilDate}
                onChange={(event) => patch({ untilDate: event.target.value })}
                className="w-44"
              />
            ) : null}

            {value.endMode === 'after' ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={value.count}
                  onChange={(event) => patch({ count: Math.max(1, Number(event.target.value) || 1) })}
                  className="w-20"
                />
                <span className="text-mini text-[var(--color-ink-soft)]">
                  {t('event.recurrenceEndCount')}
                </span>
              </div>
            ) : null}
          </div>
        </Field>
      ) : null}
    </div>
  )
}