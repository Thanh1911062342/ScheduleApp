/** Ứng dụng gốc: providers, router, cổng xác thực. */

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { ToastHost } from '@/components/ui/Toast'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { AuthPage } from '@/features/auth/AuthPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ApiRequestError } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Không refetch khi focus lại cửa sổ — với lịch thì gây nháy không cần thiết.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Không thử lại các lỗi xác thực hay lỗi dữ liệu — chỉ thử lại lỗi mạng.
        if (error instanceof ApiRequestError) {
          if (error.status >= 400 && error.status < 500) return false
        }
        return failureCount < 2
      },
    },
  },
})

/** Định tuyến đơn giản dựa trên đường dẫn — tránh phụ thuộc router cho 3 route. */
function usePathname(): string {
  return window.location.pathname
}

function Routes() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const restore = useAuthStore((s) => s.restore)

  // Khôi phục phiên từ token đã lưu, một lần khi khởi động.
  useEffect(() => {
    void restore()
  }, [restore])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-paper)]">
        <p className="text-mini text-[var(--color-ink-faint)]">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  const path = usePathname()
  if (path.startsWith('/settings')) {
    return <SettingsPage />
  }

  return <CalendarPage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes />
      <ToastHost />
    </QueryClientProvider>
  )
}