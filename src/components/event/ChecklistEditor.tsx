/**
 * Trình sửa checklist trong form sự kiện.
 *
 * Checklist gắn với sự kiện gốc, nên chỉ sửa được khi sự kiện đã tồn tại.
 * Mục mới thêm ngay khi bấm Enter (không chờ bấm Lưu) — vì ở đây đã có
 * event_id, thêm ngay thì đơn giản hơn là gom lại rồi gửi kèm.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Checkbox, Input } from '@/components/ui/Field'
import { useEventChecklist } from '@/lib/useEventChecklist'

interface ChecklistEditorProps {
  eventId: string
  total: number
  done: number
  onToggle: (itemId: string, isDone: boolean) => Promise<void>
}

export function ChecklistEditor({ eventId, total, done, onToggle }: ChecklistEditorProps) {
  const { t } = useTranslation()
  const [newContent, setNewContent] = useState('')
  const { items, isLoading, add, remove, isMutating } = useEventChecklist(eventId)

  async function handleAdd() {
    const content = newContent.trim()
    if (!content) return
    setNewContent('')
    await add(content)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-mini font-medium text-[var(--color-ink-soft)]">
          {t('event.checklist')}
        </span>
        {total > 0 ? (
          <span className="tnum text-micro text-[var(--color-ink-faint)]">
            {t('event.checklistProgress', { done, total })}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-mini text-[var(--color-ink-faint)]">{t('common.loading')}</p>
      ) : null}

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2">
            <Checkbox
              checked={item.is_done}
              onChange={(checked) => void onToggle(item.id, checked)}
            />
            <span
              className={
                item.is_done
                  ? 'flex-1 text-mini text-[var(--color-ink-faint)] line-through'
                  : 'flex-1 text-mini text-[var(--color-ink)]'
              }
            >
              {item.content}
            </span>
            <button
              type="button"
              onClick={() => void remove(item.id)}
              aria-label={t('common.delete')}
              className="shrink-0 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-danger)] focus-visible:opacity-100"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleAdd()
            }
          }}
          placeholder={t('event.checklistAdd')}
          disabled={isMutating}
          className="flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void handleAdd()}
          disabled={isMutating || !newContent.trim()}
        >
          {t('common.add')}
        </Button>
      </div>
    </div>
  )
}