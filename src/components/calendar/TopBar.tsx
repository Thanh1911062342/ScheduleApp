/**
 * Thanh công cụ trên cùng: điều hướng tháng, đổi chế độ xem, lọc lịch con,
 * tìm kiếm, menu người dùng.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChevronIcon, MonthYearPicker } from '@/components/calendar/MonthYearPicker'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { formatCursorTitle, shiftCursor } from '@/lib/date'
import { useAuthStore } from '@/stores/authStore'
import { useCalendarUi, type ViewMode } from '@/stores/calendarUiStore'
import type { Calendar } from '@/types'

interface TopBarProps {
  calendars: Calendar[]
}

export function TopBar({ calendars }: TopBarProps) {
  const { t } = useTranslation()
  const { cursor, view, setCursor, setView, goToday, hiddenCalendarIds, toggleCalendarVisibility } =
    useCalendarUi()
  const user = useAuthStore((s) => s.user)
  const setLocale = useAuthStore((s) => s.setLocale)
  const logout = useAuthStore((s) => s.logout)
  const setSearchOpen = useCalendarUi((s) => s.setSearchOpen)

  const weekStart = user?.week_start ?? 1
  const title = formatCursorTitle(cursor, view, weekStart)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2.5">
      {/* Điều hướng — đơn vị theo chế độ xem: tháng / tuần / ngày */}
      <div className="relative flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCursor(shiftCursor(cursor, view, -1))}
          aria-label={t('calendar.previous')}
        >
          <ChevronIcon direction="left" />
        </Button>

        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          className={cn(
            'min-w-[9rem] rounded-[var(--radius-note)] px-2 py-1 font-serif text-sm font-semibold',
            'text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-sunken)]',
            view !== 'month' && 'min-w-[11rem] text-mini sm:text-sm',
          )}
        >
          {title}
        </button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCursor(shiftCursor(cursor, view, 1))}
          aria-label={t('calendar.next')}
        >
          <ChevronIcon direction="right" />
        </Button>

        <Button size="sm" variant="secondary" onClick={goToday} className="ml-1">
          {t('calendar.today')}
        </Button>

        <MonthYearPicker
          open={pickerOpen}
          cursor={cursor}
          onClose={() => setPickerOpen(false)}
          onPick={setCursor}
        />
      </div>

      {/* Chế độ xem — ẩn trên mobile rất nhỏ để tiết kiệm chỗ */}
      <SegmentedControl<ViewMode>
        value={view}
        onChange={setView}
        className="ml-auto hidden sm:inline-flex"
        options={[
          { value: 'month', label: t('calendar.viewMonth') },
          { value: 'week', label: t('calendar.viewWeek') },
          { value: 'day', label: t('calendar.viewDay') },
        ]}
      />

      {/* Lọc lịch con */}
      <div className="relative ml-auto sm:ml-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
        >
          <span className="flex items-center gap-1.5">
            {/* Chấm màu các lịch đang hiện */}
            <span className="flex -space-x-0.5">
              {calendars
                .filter((c) => !hiddenCalendarIds.has(c.id))
                .slice(0, 3)
                .map((c) => (
                  <span
                    key={c.id}
                    className="h-2 w-2 rounded-full ring-1 ring-[var(--color-paper)]"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
            </span>
            <span className="hidden sm:inline">{t('calendar.filter')}</span>
          </span>
        </Button>

        {filterOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-default"
              aria-label={t('common.close')}
              onClick={() => setFilterOpen(false)}
              tabIndex={-1}
            />
            <div className="animate-fade-in absolute right-0 z-40 mt-1 w-56 rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.10)]">
              <p className="px-2 py-1 text-micro text-[var(--color-ink-faint)]">
                {t('calendar.filterTitle')}
              </p>
              {calendars.map((calendar) => {
                const hidden = hiddenCalendarIds.has(calendar.id)
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    onClick={() => toggleCalendarVisibility(calendar.id)}
                    className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-mini transition-colors hover:bg-[var(--color-paper-sunken)]"
                  >
                    <span
                      className={cn(
                        'h-3 w-3 shrink-0 rounded-full border',
                        hidden && 'opacity-30',
                      )}
                      style={{ backgroundColor: calendar.color, borderColor: calendar.color }}
                    />
                    <span className={cn('flex-1 truncate', hidden && 'text-[var(--color-ink-faint)] line-through')}>
                      {calendar.id === calendars[0]?.id && calendar.name === 'Cá nhân'
                        ? t('calendar.defaultNamePersonal')
                        : calendar.name}
                    </span>
                    {calendar.is_default ? (
                      <span className="shrink-0 text-[9px] text-[var(--color-ink-faint)]">
                        {t('calendar.defaultBadge')}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* Tìm kiếm */}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setSearchOpen(true)}
        aria-label={t('common.search')}
        title={`${t('common.search')} (Ctrl+K)`}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Button>

      {/* Menu người dùng */}
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={user?.display_name ?? 'user'}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] font-semibold text-[var(--color-paper)]">
            {user?.display_name?.trim().charAt(0).toUpperCase() ?? '?'}
          </span>
        </Button>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-default"
              aria-label={t('common.close')}
              onClick={() => setMenuOpen(false)}
              tabIndex={-1}
            />
            <div className="animate-fade-in absolute right-0 z-40 mt-1 w-52 rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.10)]">
              <div className="border-b border-[var(--color-rule)] px-2 py-1.5">
                <p className="truncate text-mini font-medium">{user?.display_name}</p>
                <p className="truncate text-micro text-[var(--color-ink-faint)]">{user?.email}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void setLocale(user?.locale === 'vi' ? 'en' : 'vi')
                  setMenuOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-mini transition-colors hover:bg-[var(--color-paper-sunken)]"
              >
                <span>{t('settings.language')}</span>
                <span className="text-[var(--color-ink-faint)]">
                  {user?.locale === 'en' ? 'EN' : 'VI'}
                </span>
              </button>

              <a
                href="/settings"
                className="block rounded-[6px] px-2 py-1.5 text-mini transition-colors hover:bg-[var(--color-paper-sunken)]"
                onClick={() => setMenuOpen(false)}
              >
                {t('settings.title')}
              </a>

              <button
                type="button"
                onClick={() => {
                  void logout()
                  setMenuOpen(false)
                }}
                className="w-full rounded-[6px] px-2 py-1.5 text-left text-mini text-[var(--color-danger)] transition-colors hover:bg-[var(--color-paper-sunken)]"
              >
                {t('auth.logout')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  )
}