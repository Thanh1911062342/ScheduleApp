/**
 * Lớp tìm kiếm toàn màn hình — mở bằng Ctrl+K hoặc nút kính lúp.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { formatFullDate, formatTime } from '@/lib/date'
import { useSearch } from '@/lib/hooks'
import { useCalendarUi } from '@/stores/calendarUiStore'

export function SearchOverlay() {
  const { t } = useTranslation()
  const open = useCalendarUi((s) => s.searchOpen)
  const setOpen = useCalendarUi((s) => s.setSearchOpen)
  const setCursor = useCalendarUi((s) => s.setCursor)
  const openEdit = useCalendarUi((s) => s.openEdit)

  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce để không bắn request mỗi ký tự.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250)
    return () => clearTimeout(timer)
  }, [term])

  const { data, isFetching } = useSearch(debounced, open)

  useEffect(() => {
    if (open) {
      setTerm('')
      setDebounced('')
      // Chờ modal mount xong mới focus.
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <button
        type="button"
        aria-label={t('common.close')}
        className="animate-scrim-in absolute inset-0 cursor-default bg-black/25 dark:bg-black/50"
        onClick={() => setOpen(false)}
        tabIndex={-1}
      />

      <div className="animate-fade-in relative mx-4 w-full max-w-lg rounded-[var(--radius-note)] border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-rule)] px-3 py-2.5">
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-[var(--color-ink-faint)]"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm('')}
              className="shrink-0 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              aria-label={t('common.close')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {!debounced ? (
            <p className="px-2 py-6 text-center text-mini text-[var(--color-ink-faint)]">
              {t('search.hint')}
            </p>
          ) : isFetching ? (
            <p className="px-2 py-6 text-center text-mini text-[var(--color-ink-faint)]">
              {t('common.loading')}
            </p>
          ) : !data || data.length === 0 ? (
            <p className="px-2 py-6 text-center text-mini text-[var(--color-ink-faint)]">
              {t('search.noResults')}
            </p>
          ) : (
            <>
              <p className="px-2 py-1 text-micro text-[var(--color-ink-faint)]">
                {t('search.resultsCount', { count: data.length })}
              </p>
              {data.map((occ) => (
                <button
                  key={occ.occurrence_key}
                  type="button"
                  onClick={() => {
                    setCursor(new Date(`${occ.occurrence_date}T00:00:00`))
                    openEdit(occ)
                    setOpen(false)
                  }}
                  className="flex w-full flex-col gap-0.5 rounded-[6px] px-2 py-2 text-left transition-colors hover:bg-[var(--color-paper-sunken)]"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: occ.color ?? occ.calendar.color }}
                    />
                    <span className="truncate text-mini font-medium text-[var(--color-ink)]">
                      {occ.title}
                    </span>
                  </span>
                  <span className="tnum pl-[9px] text-micro text-[var(--color-ink-faint)]">
                    {formatFullDate(occ.occurrence_date)}
                    {!occ.is_all_day && occ.start_time ? ` · ${formatTime(occ.start_time)}` : ''}
                    {occ.location ? ` · ${occ.location}` : ''}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-rule)] px-3 py-2">
          <span className="text-micro text-[var(--color-ink-faint)]">{t('search.hint')}</span>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  )
}