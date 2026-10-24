/**
 * API client.
 *
 * Hai điểm quan trọng:
 * 1. Backend trả lỗi dạng `{code, message, details}`. Ta ném `ApiError` kèm
 *    `code` để FE dịch qua i18n — không hiển thị `message` của server.
 * 2. Access token hết hạn (15 phút) thì tự động refresh MỘT lần rồi thử lại.
 *    Nhiều request 401 cùng lúc dùng chung một promise refresh để không bắn
 *    ra N lần refresh (điều này sẽ vô hiệu hoá token vừa xoay).
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import type {
  ApiError,
  AuthTokens,
  Calendar,
  CalendarPayload,
  ChecklistItem,
  EventBulkPayload,
  EventCreatePayload,
  EventItem,
  EventUpdatePayload,
  LoginPayload,
  MovePayload,
  Occurrence,
  RecurrenceScope,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '@/types'

/**
 * Địa chỉ API.
 *
 * - Dev: để nguyên `/api/v1`, Vite proxy sang backend (xem vite.config.ts).
 * - Production (host trên Vercel): set biến môi trường `VITE_API_BASE_URL`
 *   trỏ thẳng tới backend, ví dụ `https://schedule-api.up.railway.app/api/v1`.
 *   Phải là biến `VITE_*` mới được nhúng vào bundle lúc build.
 */
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

const ACCESS_KEY = 'schedule.access_token'
const REFRESH_KEY = 'schedule.refresh_token'

// --- Lưu token ---------------------------------------------------------------

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function storeTokens(tokens: Pick<AuthTokens, 'access_token' | 'refresh_token'>): void {
  try {
    localStorage.setItem(ACCESS_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  } catch {
    // Chế độ riêng tư có thể chặn — phiên sẽ không sống qua reload.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // bỏ qua
  }
}

// --- Lỗi ---------------------------------------------------------------------

export class ApiRequestError extends Error {
  readonly code: string
  readonly status: number
  readonly details: Record<string, unknown>

  constructor(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.status = status
    this.details = details
  }

  /** Khoá i18n để dịch: `errors.<code>`. */
  get i18nKey(): string {
    return `errors.${this.code}`
  }
}

function toApiRequestError(error: unknown): ApiRequestError {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<ApiError>
    const status = err.response?.status ?? 0
    const body = err.response?.data

    if (body && typeof body === 'object' && 'code' in body) {
      return new ApiRequestError(body.code, body.message, status, body.details ?? {})
    }
    if (status === 0) {
      return new ApiRequestError('errors.network', err.message, 0)
    }
    return new ApiRequestError('errors.http', err.message, status)
  }
  return new ApiRequestError('errors.unknown', String(error), 0)
}

// --- Client ------------------------------------------------------------------

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Callback được gọi khi refresh thất bại — store đăng ký để đăng xuất. */
let onAuthFailure: (() => void) | null = null

export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler
}

/**
 * Promise refresh dùng chung. Nhiều request 401 đồng thời sẽ chờ cùng một
 * lần refresh thay vì mỗi request tự refresh (làm hỏng cơ chế xoay token).
 */
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new ApiRequestError('auth.invalid_token', 'No refresh token', 401)
  }

  // Dùng axios trần, KHÔNG qua interceptor, tránh đệ quy vô hạn.
  const response = await axios.post<AuthTokens>(`${API_BASE}/auth/refresh`, {
    refresh_token: refreshToken,
  })
  storeTokens(response.data)
  return response.data.access_token
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }

    const isAuthEndpoint = original?.url?.includes('/auth/')
    const isRefreshCall = original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !original?._retried && !isAuthEndpoint) {
      original._retried = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const newToken = await refreshPromise
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`
        }
        return http.request(original)
      } catch {
        clearTokens()
        onAuthFailure?.()
        return Promise.reject(toApiRequestError(error))
      }
    }

    if (error.response?.status === 401 && isRefreshCall) {
      clearTokens()
      onAuthFailure?.()
    }

    return Promise.reject(toApiRequestError(error))
  },
)

// --- Endpoint ----------------------------------------------------------------

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/register', payload)
    return data
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/login', payload)
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refresh_token: refreshToken })
  },

  async me(): Promise<User> {
    const { data } = await http.get<User>('/auth/me')
    return data
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await http.patch<User>('/auth/me', payload)
    return data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}

export const calendarsApi = {
  async list(): Promise<Calendar[]> {
    const { data } = await http.get<Calendar[]>('/calendars')
    return data
  },

  async create(payload: CalendarPayload): Promise<Calendar> {
    const { data } = await http.post<Calendar>('/calendars', payload)
    return data
  },

  async update(
    id: string,
    payload: Partial<CalendarPayload & { is_visible: boolean }>,
  ): Promise<Calendar> {
    const { data } = await http.patch<Calendar>(`/calendars/${id}`, payload)
    return data
  },

  async setDefault(id: string): Promise<Calendar> {
    const { data } = await http.post<Calendar>(`/calendars/${id}/set-default`)
    return data
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/calendars/${id}`)
  },
}

export interface OccurrenceQuery {
  start: string
  end: string
  calendarIds?: string[]
  q?: string
  statuses?: string[]
}

export const eventsApi = {
  /** API lưới lịch gọi — đã mở rộng sự kiện lặp trong khoảng ngày. */
  async listOccurrences(query: OccurrenceQuery): Promise<Occurrence[]> {
    const { data } = await http.get<{ items: Occurrence[] }>('/events', {
      params: {
        start: query.start,
        end: query.end,
        calendar_ids: query.calendarIds?.length ? query.calendarIds : undefined,
        q: query.q || undefined,
        status: query.statuses?.length ? query.statuses : undefined,
      },
      // Mảng phải gửi dạng lặp khoá, không phải `ids[]=`.
      paramsSerializer: { indexes: null },
    })
    return data.items
  },

  async get(id: string): Promise<EventItem> {
    const { data } = await http.get<EventItem>(`/events/${id}`)
    return data
  },

  async create(payload: EventCreatePayload): Promise<EventItem> {
    const { data } = await http.post<EventItem>('/events', payload)
    return data
  },

  /** Tạo cho cả khoảng ngày (tính năng khoanh vùng). */
  async createBulk(payload: EventBulkPayload): Promise<EventItem[]> {
    const { data } = await http.post<{ items: EventItem[] }>('/events/bulk', payload)
    return data.items
  },

  async update(
    id: string,
    payload: EventUpdatePayload,
    scope: RecurrenceScope = 'all',
    occurrenceDate?: string,
  ): Promise<EventItem> {
    const { data } = await http.patch<EventItem>(`/events/${id}`, payload, {
      params: { scope, occurrence_date: occurrenceDate },
    })
    return data
  },

  async remove(
    id: string,
    scope: RecurrenceScope = 'all',
    occurrenceDate?: string,
  ): Promise<void> {
    await http.delete(`/events/${id}`, {
      params: { scope, occurrence_date: occurrenceDate },
    })
  },

  async restore(id: string): Promise<EventItem> {
    const { data } = await http.post<EventItem>(`/events/${id}/restore`)
    return data
  },

  async listDeleted(): Promise<EventItem[]> {
    const { data } = await http.get<{ items: EventItem[] }>('/events/deleted')
    return data.items
  },

  async move(id: string, payload: MovePayload): Promise<EventItem> {
    const { data } = await http.patch<EventItem>(`/events/${id}/move`, payload)
    return data
  },

  async search(q: string, start?: string, end?: string): Promise<Occurrence[]> {
    const { data } = await http.get<{ items: Occurrence[] }>('/search', {
      params: { q, start, end },
    })
    return data.items
  },
}

export const checklistApi = {
  async add(eventId: string, content: string): Promise<ChecklistItem> {
    const { data } = await http.post<ChecklistItem>(`/events/${eventId}/checklist`, {
      content,
    })
    return data
  },

  async update(
    itemId: string,
    payload: { content?: string; is_done?: boolean },
  ): Promise<ChecklistItem> {
    const { data } = await http.patch<ChecklistItem>(`/checklist/${itemId}`, payload)
    return data
  },

  async remove(itemId: string): Promise<void> {
    await http.delete(`/checklist/${itemId}`)
  },

  async reorder(eventId: string, itemIds: string[]): Promise<ChecklistItem[]> {
    const { data } = await http.put<ChecklistItem[]>(
      `/events/${eventId}/checklist/reorder`,
      { item_ids: itemIds },
    )
    return data
  },
}