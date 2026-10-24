/**
 * Kiểu dữ liệu dùng chung — khớp với response của backend.
 *
 * Ngày dùng chuỗi ISO `YYYY-MM-DD`, giờ dùng `HH:mm:ss` — KHÔNG chuyển sang
 * đối tượng Date khi lưu trữ. Lý do: sự kiện là "giờ địa phương theo ý người
 * dùng", quy đổi Date/UTC sẽ gây lệch ngày khi user đổi múi giờ.
 */

export type Locale = 'vi' | 'en'
export type Theme = 'light' | 'dark' | 'system'
export type EventStatus = 'confirmed' | 'done' | 'cancelled'
export type RepeatFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type RecurrenceScope = 'this' | 'following' | 'all'
export type BulkMode = 'per_day' | 'span'

/** `YYYY-MM-DD` */
export type DateString = string
/** `HH:mm:ss` hoặc `HH:mm` */
export type TimeString = string

export interface User {
  id: string
  email: string
  display_name: string
  tzid: string
  week_start: number
  locale: Locale
  theme: Theme
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface Calendar {
  id: string
  name: string
  color: string
  is_default: boolean
  is_visible: boolean
  position: number
}

export interface ChecklistItem {
  id: string
  content: string
  is_done: boolean
  position: number
}

export interface Recurrence {
  freq: RepeatFreq
  interval: number
  by_weekday: string | null
  by_monthday: number | null
  until_date: DateString | null
  count: number | null
}

export interface EventItem {
  id: string
  calendar_id: string
  title: string
  description: string | null
  location: string | null
  is_all_day: boolean
  start_date: DateString
  end_date: DateString
  start_time: TimeString | null
  end_time: TimeString | null
  tzid: string
  color: string | null
  status: EventStatus
  recurrence: Recurrence | null
  checklist: ChecklistItem[]
  calendar: Calendar | null
}

/**
 * Một lần xuất hiện cụ thể — thứ lưới lịch hiển thị.
 *
 * Sự kiện lặp không được lưu sẵn thành N bản ghi; backend mở rộng ra khi hỏi.
 * `occurrence_key` là `event_id + ngày`, dùng làm React key và để gọi
 * PATCH/DELETE với `scope=this`.
 */
export interface Occurrence {
  occurrence_key: string
  event_id: string
  occurrence_date: DateString
  is_recurring: boolean
  is_override: boolean
  title: string
  description: string | null
  location: string | null
  is_all_day: boolean
  start_date: DateString
  end_date: DateString
  start_time: TimeString | null
  end_time: TimeString | null
  tzid: string
  color: string | null
  status: EventStatus
  calendar: Calendar
  checklist_total: number
  checklist_done: number
}

export interface ApiError {
  code: string
  message: string
  details: Record<string, unknown>
}

// --- Payload gửi lên ---------------------------------------------------------

export interface RegisterPayload {
  email: string
  password: string
  display_name: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface EventCreatePayload {
  title: string
  start_date: DateString
  end_date?: DateString
  is_all_day: boolean
  start_time?: TimeString | null
  end_time?: TimeString | null
  calendar_id?: string | null
  description?: string | null
  location?: string | null
  color?: string | null
  recurrence?: Recurrence | null
  checklist?: string[]
}

export interface EventUpdatePayload {
  title?: string
  start_date?: DateString
  end_date?: DateString
  is_all_day?: boolean
  start_time?: TimeString | null
  end_time?: TimeString | null
  calendar_id?: string
  description?: string | null
  location?: string | null
  color?: string | null
  status?: EventStatus
  recurrence?: Recurrence | null
}

export interface EventBulkPayload {
  title: string
  start_date: DateString
  end_date: DateString
  mode: BulkMode
  skip_weekends: boolean
  is_all_day: boolean
  start_time?: TimeString | null
  end_time?: TimeString | null
  calendar_id?: string | null
  description?: string | null
  location?: string | null
  checklist?: string[]
}

export interface MovePayload {
  target_date: DateString
  occurrence_date?: DateString
  scope?: RecurrenceScope
}

export interface UpdateProfilePayload {
  display_name?: string
  tzid?: string
  week_start?: number
  locale?: Locale
  theme?: Theme
}

export interface CalendarPayload {
  name: string
  color?: string
}