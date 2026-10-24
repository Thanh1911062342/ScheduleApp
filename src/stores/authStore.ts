/**
 * Store xác thực.
 *
 * Token nằm ở localStorage (do `lib/api.ts` quản lý). Store này giữ user hiện
 * tại và trạng thái đã khôi phục phiên chưa.
 */

import { create } from 'zustand'

import {
  authApi,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAuthFailureHandler,
  storeTokens,
} from '@/lib/api'
import { storeLocale, isSupportedLocale } from '@/lib/i18n'
import i18n from '@/lib/i18n'
import type { LoginPayload, RegisterPayload, Theme, UpdateProfilePayload, User } from '@/types'

interface AuthState {
  user: User | null
  /** true khi đã thử khôi phục phiên xong (dù thành công hay không). */
  ready: boolean
  loading: boolean

  register: (payload: RegisterPayload) => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  setLocale: (locale: 'vi' | 'en') => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
}

/** Áp ngôn ngữ và giao diện từ hồ sơ user vào DOM. */
function applyUserPreferences(user: User): void {
  if (isSupportedLocale(user.locale) && i18n.language !== user.locale) {
    void i18n.changeLanguage(user.locale)
  }
  storeLocale(user.locale)
  applyTheme(user.theme)
}

/**
 * Gắn class `dark` lên <html>.
 *
 * Tailwind v4 đọc biến này qua `@custom-variant dark (&:where(.dark, .dark *))`
 * trong `styles/index.css`. Với 'system' thì theo dõi media query.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  loading: false,

  async register(payload) {
    set({ loading: true })
    try {
      const tokens = await authApi.register(payload)
      storeTokens(tokens)
      applyUserPreferences(tokens.user)
      set({ user: tokens.user, ready: true })
    } finally {
      set({ loading: false })
    }
  },

  async login(payload) {
    set({ loading: true })
    try {
      const tokens = await authApi.login(payload)
      storeTokens(tokens)
      applyUserPreferences(tokens.user)
      set({ user: tokens.user, ready: true })
    } finally {
      set({ loading: false })
    }
  },

  async logout() {
    const refreshToken = getRefreshToken()
    // Thu hồi token ở server, nhưng dù lỗi vẫn phải xoá ở client.
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // Bỏ qua — thoát cục bộ vẫn phải thành công.
      }
    }
    clearTokens()
    set({ user: null, ready: true })
  },

  async restore() {
    if (!getAccessToken()) {
      set({ ready: true })
      return
    }
    try {
      const user = await authApi.me()
      applyUserPreferences(user)
      set({ user, ready: true })
    } catch {
      clearTokens()
      set({ user: null, ready: true })
    }
  },

  async updateProfile(payload) {
    const user = await authApi.updateProfile(payload)
    applyUserPreferences(user)
    set({ user })
  },

  async setLocale(locale) {
    // Đổi ngay trên UI cho mượt, rồi mới lưu lên server.
    void i18n.changeLanguage(locale)
    storeLocale(locale)
    const user = get().user
    if (!user) return
    try {
      const updated = await authApi.updateProfile({ locale })
      set({ user: updated })
    } catch {
      // Lưu thất bại thì vẫn giữ ngôn ngữ đã đổi cục bộ.
    }
  },

  async setTheme(theme) {
    applyTheme(theme)
    const user = get().user
    if (!user) return
    try {
      const updated = await authApi.updateProfile({ theme })
      set({ user: updated })
    } catch {
      // bỏ qua
    }
  },
}))

// Khi refresh token thất bại ở tầng axios, đăng xuất khỏi store.
setAuthFailureHandler(() => {
  useAuthStore.setState({ user: null, ready: true })
})

// Theo dõi thay đổi giao diện hệ thống khi đang ở chế độ 'system'.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const user = useAuthStore.getState().user
    if (!user || user.theme === 'system') {
      applyTheme(user?.theme ?? 'system')
    }
  })
}