/**
 * Tiện ích ngày giờ.
 *
 * Nguyên tắc: mọi thao tác trên ngày đều dùng chuỗi `YYYY-MM-DD` và đối tượng
 * `Date` ở giờ ĐỊA PHƯƠNG (không UTC). Không bao giờ gọi `toISOString()` để
 * lấy ngày — hàm đó trả UTC và sẽ lệch một ngày với múi giờ dương.
 */

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS, vi as viLocale } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'

import i18n from '@/lib/i18n'
import type { DateString, Locale, TimeString } from '@/types'

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  vi: viLocale,
  en: enUS,
}

/** Locale date-fns khớp với ngôn ngữ giao diện đang chọn. */
export function currentDateLocale(): DateFnsLocale {
  const lng = i18n.language
  return DATE_FNS_LOCALES[lng === 'en' ? 'en' : 'vi']
}

/** Dịch một khoá i18n (dùng cho chuỗi định dạng ngày). */
function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string
}

// --- Chuyển đổi --------------------------------------------------------------

/** `Date` (giờ địa phương) -> `YYYY-MM-DD`. KHÔNG dùng toISOString(). */
export function toDateString(date: Date): DateString {
  return format(date, 'yyyy-MM-dd')
}

/** `YYYY-MM-DD` -> `Date` ở nửa đêm giờ địa phương. */
export function fromDateString(value: DateString): Date {
  return parse(value, 'yyyy-MM-dd', new Date())
}

/** `HH:mm:ss` hoặc `HH:mm` -> `HH:mm` để hiển thị và cho input[type=time]. */
export function toTimeInputValue(value: TimeString | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

/** `HH:mm` -> `HH:mm:00` để gửi lên backend. */
export function toTimeString(value: string): TimeString {
  return value.length === 5 ? `${value}:00` : value
}

// --- Định dạng hiển thị ------------------------------------------------------

export function formatMonthYear(date: Date): string {
  return format(date, t('calendar.formats.monthYear'), { locale: currentDateLocale() })
}

export function formatFullDate(value: DateString | Date): string {
  const date = typeof value === 'string' ? fromDateString(value) : value
  return format(date, t('calendar.formats.fullDate'), { locale: currentDateLocale() })
}

export function formatShortDate(value: DateString | Date): string {
  const date = typeof value === 'string' ? fromDateString(value) : value
  return format(date, t('calendar.formats.shortDate'), { locale: currentDateLocale() })
}

export function formatDayMonth(value: DateString | Date): string {
  const date = typeof value === 'string' ? fromDateString(value) : value
  return format(date, t('calendar.formats.dayMonth'), { locale: currentDateLocale() })
}

export function formatTime(value: TimeString | null | undefined): string {
  if (!value) return ''
  const [hours, minutes] = value.split(':')
  return format(
    parse(`${hours}:${minutes}`, 'HH:mm', new Date()),
    t('calendar.formats.time'),
    { locale: currentDateLocale() },
  )
}

/** Tên thứ viết tắt, đã xoay theo ngày bắt đầu tuần của user. */
export function weekdayLabels(weekStart: number): string[] {
  const labels = i18n.t('calendar.weekdaysShort', { returnObjects: true }) as string[]
  if (!Array.isArray(labels) || labels.length !== 7) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }
  return rotateByWeekStart(labels, weekStart)
}

export function weekdayLongLabel(weekStart: number, index: number): string {
  const labels = i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[]
  if (!Array.isArray(labels) || labels.length !== 7) {
    return ''
  }
  return rotateByWeekStart(labels, weekStart)[index] ?? ''
}

/** Xoay mảng 7 phần tử (T2..CN) theo ngày bắt đầu tuần: 1 = T2, 0 = CN. */
function rotateByWeekStart<T>(items: T[], weekStart: number): T[] {
  if (weekStart === 0) {
    // Chủ nhật lên đầu.
    return [items[6], ...items.slice(0, 6)]
  }
  return items
}

// --- Logic lịch --------------------------------------------------------------

/**
 * 42 ngày của lưới tháng (6 tuần), gồm các ngày đệm của tháng kề.
 * Số ô cố định để lưới không nhảy chiều cao khi đổi tháng.
 */
export function monthGridDays(monthCursor: Date, weekStart: number): Date[] {
  const first = startOfMonth(monthCursor)
  const gridStart = startOfWeek(first, { weekStartsOn: weekStart as 0 | 1 })
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function monthRange(monthCursor: Date): { start: Date; end: Date } {
  const first = startOfMonth(monthCursor)
  return { start: first, end: endOfMonth(monthCursor) }
}

/** Khoảng ngày mà lưới tháng thực sự hiển thị (rộng hơn tháng một chút). */
export function monthGridRange(
  monthCursor: Date,
  weekStart: number,
): { start: Date; end: Date } {
  const days = monthGridDays(monthCursor, weekStart)
  return { start: days[0], end: days[days.length - 1] }
}

export function weekDays(cursor: Date, weekStart: number): Date[] {
  const first = startOfWeek(cursor, { weekStartsOn: weekStart as 0 | 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

export function daysBetween(start: Date, end: Date): Date[] {
  const [from, to] = start <= end ? [start, end] : [end, start]
  return eachDayOfInterval({ start: from, end: to })
}

/** Chuẩn hoá khoảng ngày: trả [đầu, cuối] theo đúng thứ tự thời gian. */
export function normalizeRange(a: Date, b: Date): { start: Date; end: Date } {
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

export function countDaysInRange(start: Date, end: Date, skipWeekends: boolean): number {
  return daysBetween(start, end).filter((d) => !skipWeekends || !isWeekend(d)).length
}

/** Nhãn khoảng ngày cho popup tạo hàng loạt: "19/10 – 25/10/2026". */
export function formatRangeLabel(start: Date, end: Date): string {
  const locale = currentDateLocale()
  if (isSameMonth(start, end)) {
    return `${format(start, t('calendar.formats.dayMonth'), { locale })} – ${format(
      end,
      t('calendar.formats.shortDate'),
      { locale },
    )}`
  }
  return `${format(start, t('calendar.formats.shortDate'), { locale })} – ${format(
    end,
    t('calendar.formats.shortDate'),
    { locale },
  )}`
}

export { addDays, addMonths, isSameDay, isSameMonth, isToday, isWeekend, startOfMonth }