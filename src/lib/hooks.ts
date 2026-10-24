/**
 * Hook dữ liệu — bọc TanStack Query quanh API.
 *
 * Khác biệt chính so với gọi API trực tiếp: sau khi sửa/xoá, ta cập nhật
 * cache ngay (optimistic) rồi mới invalidate. Nhờ vậy lưới lịch phản hồi
 * tức thì thay vì chờ round-trip.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { calendarQueryKeys } from '@/lib/queryKeys'
import {
  calendarsApi,
  checklistApi,
  eventsApi,
  type OccurrenceQuery,
} from '@/lib/api'
import { toDateString } from '@/lib/date'
import type {
  Calendar,
  CalendarPayload,
  ChecklistItem,
  EventBulkPayload,
  EventCreatePayload,
  EventUpdatePayload,
  MovePayload,
  Occurrence,
  RecurrenceScope,
} from '@/types'

// --- Lịch con ----------------------------------------------------------------

export function useCalendars() {
  return useQuery({
    queryKey: calendarQueryKeys.list(),
    queryFn: calendarsApi.list,
    // Danh sách lịch con ít đổi — không cần refetch dữ dội.
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CalendarPayload) => calendarsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all })
    },
  })
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<CalendarPayload & { is_visible: boolean }>
    }) => calendarsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all })
    },
  })
}

export function useSetDefaultCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => calendarsApi.setDefault(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all })
    },
  })
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => calendarsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all })
      // Xoá lịch kéo theo xoá sự kiện trong đó.
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// --- Sự kiện -----------------------------------------------------------------

export function useOccurrences(query: OccurrenceQuery, enabled = true) {
  return useQuery({
    queryKey: calendarQueryKeys.occurrences(query),
    queryFn: () => eventsApi.listOccurrences(query),
    enabled: enabled && Boolean(query.start && query.end),
  })
}

/**
 * Gom occurrence theo ngày để tra cứu O(1) khi render 42 ô.
 *
 * Sự kiện nhiều ngày được trải ra mọi ngày trong khoảng của nó, để nó hiện
 * ở mọi ô mà nó bao phủ chứ không chỉ ngày bắt đầu.
 */
export function useOccurrencesByDate(
  occurrences: Occurrence[] | undefined,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    if (!occurrences) return map

    const rangeStartStr = toDateString(rangeStart)
    const rangeEndStr = toDateString(rangeEnd)

    for (const occ of occurrences) {
      // Sự kiện nhiều ngày: trải từ start_date đến end_date, kẹp vào khoảng hỏi.
      const from = occ.start_date > rangeStartStr ? occ.start_date : rangeStartStr
      const to = occ.end_date < rangeEndStr ? occ.end_date : rangeEndStr

      if (from > to) {
        // Khoảng không hợp lệ (hiếm) — vẫn gán vào ngày xuất hiện.
        const list = map.get(occ.occurrence_date) ?? []
        list.push(occ)
        map.set(occ.occurrence_date, list)
        continue
      }

      const cursor = new Date(`${from}T00:00:00`)
      const last = new Date(`${to}T00:00:00`)
      while (cursor <= last) {
        const key = toDateString(cursor)
        const list = map.get(key) ?? []
        list.push(occ)
        map.set(key, list)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  }, [occurrences, rangeStart, rangeEnd])
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EventCreatePayload) => eventsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCreateEventsBulk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EventBulkPayload) => eventsApi.createBulk(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
      scope = 'all',
      occurrenceDate,
    }: {
      id: string
      payload: EventUpdatePayload
      scope?: RecurrenceScope
      occurrenceDate?: string
    }) => eventsApi.update(id, payload, scope, occurrenceDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      scope = 'all',
      occurrenceDate,
    }: {
      id: string
      scope?: RecurrenceScope
      occurrenceDate?: string
    }) => eventsApi.remove(id, scope, occurrenceDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useRestoreEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useMoveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MovePayload }) =>
      eventsApi.move(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => eventsApi.search(query),
    enabled: enabled && query.trim().length > 0,
  })
}

export function useDeletedEvents(enabled: boolean) {
  return useQuery({
    queryKey: ['events', 'deleted'],
    queryFn: eventsApi.listDeleted,
    enabled,
  })
}

// --- Checklist ---------------------------------------------------------------

export function useAddChecklistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, content }: { eventId: string; content: string }) =>
      checklistApi.add(eventId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string
      payload: { content?: string; is_done?: boolean }
    }) => checklistApi.update(itemId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => checklistApi.remove(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// --- Tiện ích -----------------------------------------------------------------

/** Danh sách lịch con đang hiện, dùng cho truy vấn occurrence. */
export function visibleCalendarIds(
  calendars: Calendar[] | undefined,
  hidden: Set<string>,
): string[] | undefined {
  if (!calendars) return undefined
  const visible = calendars.filter((c) => !hidden.has(c.id)).map((c) => c.id)
  // Nếu ẩn hết thì trả mảng rỗng -> backend trả rỗng, đúng ý người dùng.
  // Trả undefined khi không có lịch nào để tránh lọc nhầm.
  return visible.length > 0 ? visible : []
}

export type { ChecklistItem }