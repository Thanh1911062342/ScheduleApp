/**
 * Dịch lỗi API sang chuỗi hiển thị được.
 *
 * Backend trả `{code, message, details}` với `message` là tiếng Anh cố định.
 * Ta KHÔNG hiển thị message đó — luôn dịch `code` qua i18n để khớp ngôn ngữ
 * giao diện. Nếu thiếu khoá dịch thì rơi về thông báo chung.
 */

import type { TFunction } from 'i18next'

import { ApiRequestError } from '@/lib/api'

const KNOWN_CODES = new Set([
  'auth.invalid_credentials',
  'auth.email_taken',
  'auth.invalid_token',
  'auth.unauthorized',
  'user.not_found',
  'event.not_found',
  'event.invalid_date_range',
  'event.invalid_time_range',
  'event.invalid_recurrence',
  'calendar.not_found',
  'calendar.name_taken',
  'calendar.cannot_delete_default',
  'checklist.not_found',
  'tag.not_found',
  'tag.name_taken',
  'error.validation',
  'error.forbidden',
  'error.not_found',
  'error.conflict',
  'error.internal',
  'errors.network',
])

export function translateApiError(error: unknown, t: TFunction): string {
  if (error instanceof ApiRequestError) {
    const key = error.code.startsWith('errors.') ? error.code : `errors.${error.code}`
    if (KNOWN_CODES.has(error.code) || error.code.startsWith('errors.')) {
      return t(key)
    }
    // Mã lạ (backend mới thêm?) -> thông báo chung, không lộ tiếng Anh.
    return t('errors.generic')
  }
  if (error instanceof Error && error.message) {
    return t('errors.generic')
  }
  return t('errors.generic')
}

/** Lấy lỗi theo từng field từ response 422 của pydantic. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiRequestError && error.code === 'error.validation') {
    const fields = error.details?.fields
    if (fields && typeof fields === 'object') {
      return fields as Record<string, string>
    }
  }
  return {}
}