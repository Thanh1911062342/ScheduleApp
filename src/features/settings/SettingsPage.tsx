/**
 * Màn hình cài đặt: hồ sơ, tuỳ chọn, quản lý lịch con, bảo mật.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { ColorSwatches, Field, Input, SegmentedControl } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { authApi } from '@/lib/api'
import { translateApiError } from '@/lib/errors'
import {
  useCalendars,
  useCreateCalendar,
  useDeleteCalendar,
  useSetDefaultCalendar,
  useUpdateCalendar,
} from '@/lib/hooks'
import { LANGUAGES } from '@/lib/languages'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { Theme } from '@/types'

const CALENDAR_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#78716C',
]

export function SettingsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const setLocale = useAuthStore((s) => s.setLocale)
  const setTheme = useAuthStore((s) => s.setTheme)
  const pushToast = useCalendarUi((s) => s.pushToast)

  const calendarsQuery = useCalendars()
  const createCalendar = useCreateCalendar()
  const updateCalendar = useUpdateCalendar()
  const deleteCalendar = useDeleteCalendar()
  const setDefaultCalendar = useSetDefaultCalendar()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [weekStart, setWeekStart] = useState(user?.week_start ?? 1)
  const [tzid, setTzid] = useState(user?.tzid ?? 'Asia/Ho_Chi_Minh')
  const [saving, setSaving] = useState(false)

  const [newCalendarName, setNewCalendarName] = useState('')
  const [calendarError, setCalendarError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordOk, setPasswordOk] = useState(false)

  // Đồng bộ khi user tải xong (lần đầu render có thể chưa có user).
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name)
      setWeekStart(user.week_start)
      setTzid(user.tzid)
    }
  }, [user])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await updateProfile({ display_name: displayName, week_start: weekStart, tzid })
      pushToast({ messageKey: 'settings.profileSaved' })
    } catch (err) {
      pushToast({ messageKey: translateApiError(err, t), tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCalendar() {
    const name = newCalendarName.trim()
    if (!name) return
    setCalendarError(null)
    try {
      await createCalendar.mutateAsync({
        name,
        color: CALENDAR_COLORS[calendarsQuery.data?.length ?? 0 % CALENDAR_COLORS.length],
      })
      setNewCalendarName('')
    } catch (err) {
      setCalendarError(translateApiError(err, t))
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordOk(false)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordOk(true)
      pushToast({ messageKey: 'settings.passwordChanged' })
    } catch (err) {
      setPasswordError(translateApiError(err, t))
    }
  }

  const calendars = calendarsQuery.data ?? []

  return (
    <div className="scroll-thin min-h-dvh bg-[var(--color-paper)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-3">
        <a
          href="/"
          className="rounded p-1 text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
          aria-label={t('common.back')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <h1 className="font-serif text-base font-semibold">{t('settings.title')}</h1>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-5">
        {/* Hồ sơ */}
        <Section title={t('settings.profile')}>
          <Field label={t('settings.displayName')}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>

          <Field label={t('settings.email')}>
            <Input value={user?.email ?? ''} disabled className="opacity-60" />
          </Field>

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => void handleSaveProfile()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </Section>

        {/* Tuỳ chọn */}
        <Section title={t('settings.preferences')}>
          <Field label={t('settings.language')}>
            <SegmentedControl
              value={user?.locale ?? 'vi'}
              onChange={(value) => void setLocale(value)}
              options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.label }))}
            />
          </Field>

          <Field label={t('settings.theme')}>
            <SegmentedControl<Theme>
              value={user?.theme ?? 'system'}
              onChange={(value) => void setTheme(value)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'system', label: t('settings.themeSystem') },
              ]}
            />
          </Field>

          <Field label={t('settings.weekStart')}>
            <SegmentedControl<string>
              value={String(weekStart)}
              onChange={(value) => setWeekStart(Number(value))}
              options={[
                { value: '1', label: t('settings.weekStartMonday') },
                { value: '0', label: t('settings.weekStartSunday') },
              ]}
            />
          </Field>

          <Field label={t('settings.timezone')}>
            <Input value={tzid} onChange={(e) => setTzid(e.target.value)} />
          </Field>
        </Section>

        {/* Lịch con */}
        <Section title={t('settings.calendars')} hint={t('settings.calendarsHint')}>
          <div className="flex flex-col gap-1.5">
            {calendars.map((calendar) => (
              <div
                key={calendar.id}
                className="flex items-center gap-2 rounded-[var(--radius-note)] border border-[var(--color-rule)] px-3 py-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: calendar.color }}
                />
                <span className="min-w-0 flex-1 truncate text-mini text-[var(--color-ink)]">
                  {calendar.name}
                </span>

                {calendar.is_default ? (
                  <span className="shrink-0 text-micro text-[var(--color-ink-faint)]">
                    {t('calendar.defaultBadge')}
                  </span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void setDefaultCalendar.mutateAsync(calendar.id)}
                    >
                      {t('settings.setDefault')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void deleteCalendar.mutateAsync(calendar.id)}
                    >
                      {t('common.delete')}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--color-rule)] pt-3">
            <div className="flex items-center gap-2">
              <Input
                value={newCalendarName}
                onChange={(e) => {
                  setNewCalendarName(e.target.value)
                  setCalendarError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAddCalendar()
                  }
                }}
                placeholder={t('settings.calendarNamePlaceholder')}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => void handleAddCalendar()}
                disabled={!newCalendarName.trim() || createCalendar.isPending}
              >
                {t('settings.addCalendar')}
              </Button>
            </div>
            {calendarError ? (
              <p className="text-micro text-[var(--color-danger)]">{calendarError}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center gap-1.5">
                  <span className="text-micro text-[var(--color-ink-faint)]">{calendar.name}</span>
                  <ColorSwatches
                    colors={CALENDAR_COLORS}
                    value={calendar.color}
                    onChange={(color) => {
                      if (color) void updateCalendar.mutateAsync({ id: calendar.id, payload: { color } })
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Bảo mật */}
        <Section title={t('settings.security')}>
          <Field label={t('settings.currentPassword')}>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          {passwordError ? (
            <p className="text-micro text-[var(--color-danger)]">{passwordError}</p>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => void handleChangePassword()}
              disabled={!currentPassword || newPassword.length < 8}
            >
              {t('settings.changePassword')}
            </Button>
          </div>
          {passwordOk ? (
            <p className="text-micro text-[var(--color-accent)]">{t('settings.passwordChanged')}</p>
          ) : null}
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] p-4">
      <div>
        <h2 className="font-serif text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
        {hint ? <p className={cn('text-micro text-[var(--color-ink-faint)]')}>{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}