/** Màn hình đăng nhập / đăng ký. */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { translateApiError } from '@/lib/errors'
import { useAuthStore } from '@/stores/authStore'

type Mode = 'login' | 'register'

export function AuthPage() {
  const { t, i18n } = useTranslation()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const setLocale = useAuthStore((s) => s.setLocale)
  const loading = useAuthStore((s) => s.loading)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isRegister = mode === 'register'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (isRegister && password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }

    try {
      if (isRegister) {
        await register({ email, password, display_name: displayName })
      } else {
        await login({ email, password })
      }
    } catch (err) {
      setError(translateApiError(err, t))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-paper)] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Tiêu đề + công tắc ngôn ngữ */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">
              {t('common.appName')}
            </h1>
            <p className="mt-1 text-mini text-[var(--color-ink-faint)]">
              {isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void setLocale(i18n.language === 'vi' ? 'en' : 'vi')}
            className="rounded-[6px] border border-[var(--color-rule-strong)] px-2 py-1 text-micro text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-paper-sunken)]"
          >
            {i18n.language === 'en' ? 'EN' : 'VI'}
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-3 rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] p-4"
        >
          {isRegister ? (
            <Field label={t('auth.displayName')}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={1}
                autoComplete="name"
              />
            </Field>
          ) : null}

          <Field label={t('auth.email')}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>

          <Field
            label={t('auth.password')}
            hint={isRegister ? t('auth.passwordHint') : undefined}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </Field>

          {isRegister ? (
            <Field label={t('auth.confirmPassword')}>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
          ) : null}

          {error ? (
            <div className="rounded-[var(--radius-note)] border border-[var(--color-danger)] px-3 py-2 text-mini text-[var(--color-danger)]">
              {error}
            </div>
          ) : null}

          <Button type="submit" variant="primary" disabled={loading} className="mt-1 justify-center">
            {loading ? t('common.loading') : isRegister ? t('auth.submitRegister') : t('auth.submitLogin')}
          </Button>

          <p className={cn('text-center text-micro text-[var(--color-ink-faint)]')}>
            {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isRegister ? 'login' : 'register')
                setError(null)
              }}
              className="font-medium text-[var(--color-accent)] underline"
            >
              {isRegister ? t('auth.login') : t('auth.register')}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}