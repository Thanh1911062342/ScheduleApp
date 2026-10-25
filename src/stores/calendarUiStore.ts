/**
 * Store giao diện lịch: tháng đang xem, chế độ xem, ngày đang chọn,
 * vùng đang khoanh, popup nào đang mở.
 *
 * Chỉ giữ state UI. Dữ liệu sự kiện do TanStack Query quản lý.
 */

import { create } from 'zustand'

import { fromDateString, toDateString } from '@/lib/date'
import type { Calendar, DateString, Occurrence, RecurrenceScope } from '@/types'

export type ViewMode = 'month' | 'week' | 'day'

/** Mức zoom timeline của khung Tuần / Ngày: 0 = trọn 24h, 1 = mặc định. */
export type TimelineZoom = { week: number; day: number }

/** Ngày đang được ấn-giữ hoặc đang trong tầm ngắm của con trỏ. */
export interface EventDraft {
  startDate: DateString
  endDate: DateString
  isAllDay: boolean
  startTime: string | null
  endTime: string | null
  /** Có giá trị khi đang sửa một sự kiện đã tồn tại. */
  editing?: Occurrence | null
}

interface CalendarUiState {
  // Điều hướng
  cursor: Date
  view: ViewMode
  setCursor: (date: Date) => void
  setView: (view: ViewMode) => void
  goToday: () => void

  // Lịch con đang ẩn
  hiddenCalendarIds: Set<string>
  toggleCalendarVisibility: (id: string) => void
  setHiddenCalendars: (ids: string[]) => void
  syncCalendars: (calendars: Calendar[]) => void

  // Panel ngày
  selectedDate: DateString | null
  openDay: (date: DateString) => void
  closeDay: () => void

  // Popup tạo/sửa sự kiện
  draft: EventDraft | null
  openCreate: (date: DateString) => void
  /** Tạo lịch vào đúng khung giờ — dùng khi bấm/kéo trên lưới giờ timeline. */
  openCreateRange: (date: DateString, startMinutes: number, endMinutes: number) => void
  openEdit: (occurrence: Occurrence) => void
  closeDraft: () => void

  // Khoanh vùng nhiều ngày
  selection: { start: DateString; end: DateString } | null
  setSelection: (range: { start: DateString; end: DateString } | null) => void

  // Hỏi phạm vi khi sửa/xoá sự kiện lặp
  scopePrompt: {
    action: 'edit' | 'delete'
    occurrence: Occurrence
    resolve: (scope: RecurrenceScope | null) => void
  } | null
  askScope: (
    action: 'edit' | 'delete',
    occurrence: Occurrence,
  ) => Promise<RecurrenceScope | null>
  answerScope: (scope: RecurrenceScope | null) => void

  // Tìm kiếm
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // Zoom timeline (tuần / ngày, lưu riêng từng khung)
  timelineZoom: TimelineZoom
  setTimelineZoom: (view: 'week' | 'day', zoom: number) => void

  // Thông báo
  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

export interface Toast {
  id: string
  messageKey: string
  params?: Record<string, unknown>
  /** Nếu có, toast hiện nút hành động (ví dụ "Hoàn tác"). */
  action?: { labelKey: string; run: () => void }
  tone?: 'neutral' | 'danger'
}

export const useCalendarUi = create<CalendarUiState>((set, get) => ({
  cursor: new Date(),
  view: 'month',
  setCursor: (date) => set({ cursor: date }),
  setView: (view) => set({ view }),
  goToday: () => set({ cursor: new Date() }),

  hiddenCalendarIds: new Set(),
  toggleCalendarVisibility: (id) =>
    set((state) => {
      const next = new Set(state.hiddenCalendarIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { hiddenCalendarIds: next }
    }),
  setHiddenCalendars: (ids) => set({ hiddenCalendarIds: new Set(ids) }),
  syncCalendars: (calendars) =>
    set({ hiddenCalendarIds: new Set(calendars.filter((c) => !c.is_visible).map((c) => c.id)) }),

  selectedDate: null,
  openDay: (date) => set({ selectedDate: date, draft: null }),
  closeDay: () => set({ selectedDate: null }),

  draft: null,
  openCreate: (date) =>
    set({
      draft: {
        startDate: date,
        endDate: date,
        isAllDay: true,
        startTime: '09:00',
        endTime: '10:00',
        editing: null,
      },
      selectedDate: null,
      selection: null,
    }),
  openCreateRange: (date, startMinutes, endMinutes) => {
    // Đổi phút -> chuỗi HH:mm. Khoảng kéo chạm cuối ngày (1440) thì coi
    // như sự kiện chạy qua nửa đêm: end 23:59 để form hiển thị hợp lý.
    const toHHmm = (minutes: number) => {
      const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1))
      const h = Math.floor(clamped / 60)
      const m = clamped % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const safeEnd = endMinutes > startMinutes ? endMinutes : startMinutes + 60
    set({
      draft: {
        startDate: date,
        endDate: date,
        isAllDay: false,
        startTime: toHHmm(startMinutes),
        endTime: toHHmm(safeEnd),
        editing: null,
      },
      selectedDate: null,
      selection: null,
    })
  },
  openEdit: (occurrence) =>
    set({
      draft: {
        startDate: occurrence.start_date,
        endDate: occurrence.end_date,
        isAllDay: occurrence.is_all_day,
        startTime: occurrence.start_time?.slice(0, 5) ?? '09:00',
        endTime: occurrence.end_time?.slice(0, 5) ?? '10:00',
        editing: occurrence,
      },
      selectedDate: null,
    }),
  closeDraft: () => set({ draft: null }),

  selection: null,
  setSelection: (range) => set({ selection: range }),

  scopePrompt: null,
  askScope: (action, occurrence) =>
    new Promise<RecurrenceScope | null>((resolve) => {
      set({ scopePrompt: { action, occurrence, resolve } })
    }),
  answerScope: (scope) => {
    const prompt = get().scopePrompt
    set({ scopePrompt: null })
    prompt?.resolve(scope)
  },

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  timelineZoom: { week: 1, day: 1 },
  setTimelineZoom: (view, zoom) =>
    set((state) => ({
      timelineZoom: { ...state.timelineZoom, [view]: Math.min(1, Math.max(0, zoom)) },
    })),

  toasts: [],
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    // Tự tắt sau 4s; toast có hành động thì để lâu hơn cho kịp bấm.
    const ttl = toast.action ? 7000 : 4000
    setTimeout(() => get().dismissToast(id), ttl)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Tiện ích: ngày ISO của con trỏ hiện tại. */
export function cursorDateString(cursor: Date): DateString {
  return toDateString(cursor)
}

/** Tiện ích: con trỏ dạng Date. */
export function cursorAsDate(cursor: Date): Date {
  return fromDateString(toDateString(cursor))
}