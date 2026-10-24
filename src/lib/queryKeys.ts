/**
 * Query key tập trung một chỗ.
 *
 * Nhờ vậy invalidate đúng nhóm mà không phải nhớ chuỗi ở nhiều nơi:
 * `['events']` khớp mọi truy vấn sự kiện nhờ prefix matching của TanStack Query.
 */

import type { OccurrenceQuery } from '@/lib/api'
import type { DateString } from '@/types'

export const calendarQueryKeys = {
  all: ['calendars'] as const,
  list: () => [...calendarQueryKeys.all, 'list'] as const,

  occurrencesAll: ['events'] as const,

  occurrences: (query: OccurrenceQuery) =>
    [
      'events',
      'occurrences',
      query.start,
      query.end,
      query.calendarIds?.slice().sort().join(',') ?? 'all',
      query.q ?? '',
      query.statuses?.slice().sort().join(',') ?? '',
    ] as const,

  event: (id: string) => ['events', 'detail', id] as const,
  deleted: () => ['events', 'deleted'] as const,
  search: (q: string) => ['search', q] as const,
}

export const userQueryKeys = {
  me: ['auth', 'me'] as const,
}

/** Khoảng ngày ISO dùng cho truy vấn lịch. */
export interface DateWindow {
  start: DateString
  end: DateString
}