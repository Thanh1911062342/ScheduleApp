/**
 * Dialog hỏi phạm vi khi sửa hoặc xoá một sự kiện lặp.
 *
 * Chỉ hiện với sự kiện có `is_recurring`. Ba lựa chọn ánh xạ thẳng sang tham
 * số `scope` của API: this / following / all.
 *
 * Không dùng `Modal` thường vì đây là luồng chặn: phải trả lời mới đi tiếp.
 */

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Radio } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { formatFullDate } from '@/lib/date'
import { useCalendarUi } from '@/stores/calendarUiStore'
import type { RecurrenceScope } from '@/types'

export function RecurrenceScopeDialog() {
  const { t } = useTranslation()
  const prompt = useCalendarUi((s) => s.scopePrompt)
  const answer = useCalendarUi((s) => s.answerScope)

  if (!prompt) return null

  const { action, occurrence } = prompt
  const isDelete = action === 'delete'

  const options: { value: RecurrenceScope; label: string; hint?: string }[] = [
    {
      value: 'this',
      label: t('event.scopeThis'),
      hint: formatFullDate(occurrence.occurrence_date),
    },
    {
      value: 'following',
      label: t('event.scopeFollowing'),
      hint: formatFullDate(occurrence.occurrence_date),
    },
    { value: 'all', label: t('event.scopeAll') },
  ]

  return (
    <Modal
      open
      onClose={() => answer(null)}
      title={isDelete ? t('event.deleteConfirmTitle') : t('event.scopeTitle')}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => answer(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-mini text-[var(--color-ink-soft)]">{t('event.scopeBody')}</p>

      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => answer(option.value)}
            className={cn(
              'flex items-start gap-2.5 rounded-[var(--radius-note)] border px-3 py-2 text-left',
              'border-[var(--color-rule-strong)] transition-colors hover:bg-[var(--color-paper-sunken)]',
              isDelete && option.value === 'all' && 'hover:border-[var(--color-danger)]',
            )}
          >
            <Radio checked={false} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-mini font-medium text-[var(--color-ink)]">
                {option.label}
              </span>
              {option.hint ? (
                <span className="block text-micro text-[var(--color-ink-faint)]">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {isDelete ? (
        <p className="mt-3 text-micro text-[var(--color-ink-faint)]">
          {t('event.deleteConfirmBody')}
        </p>
      ) : null}
    </Modal>
  )
}