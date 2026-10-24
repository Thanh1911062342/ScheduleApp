/**
 * Cấu hình i18next.
 *
 * Quy ước: trong component CHỈ dùng `t('namespace.key')`, không viết chuỗi
 * tiếng Việt thẳng trong JSX. Nhờ vậy đổi ngôn ngữ không cần sửa component.
 *
 * Locale của date-fns được đồng bộ ở `lib/date.ts` theo cùng giá trị `lng`.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en.json'
import vi from '@/locales/vi.json'

export const SUPPORTED_LOCALES = ['vi', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'vi'

const STORAGE_KEY = 'schedule.locale'

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Đọc ngôn ngữ đã lưu, dùng trước khi biết user (màn hình đăng nhập). */
export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(stored)) return stored
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư) — bỏ qua.
  }
  return DEFAULT_LOCALE
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Không lưu được thì thôi, không phải lỗi chặn.
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: readStoredLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnObjects: true,
})

// Đồng bộ thuộc tính lang của thẻ <html> — cần cho screen reader và cho
// việc gạch nối từ của trình duyệt.
function syncHtmlLang(locale: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n