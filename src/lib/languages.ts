/** Danh sách ngôn ngữ dùng chung cho màn hình cài đặt và menu người dùng. */

import type { Locale } from '@/types'

export const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

/** Tên hiển thị của một ngôn ngữ. */
export function languageLabel(code: Locale): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}