/**
 * Hook lấy và sửa checklist của một sự kiện.
 *
 * Tách riêng khỏi `hooks.ts` vì đây là truy vấn theo sự kiện cụ thể, chỉ dùng
 * trong form chi tiết.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { checklistApi, http } from '@/lib/api'
import type { ChecklistItem } from '@/types'

export function useEventChecklist(eventId: string | undefined, enabled = true) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['checklist', eventId],
    queryFn: async () => {
      const { data } = await http.get<ChecklistItem[]>(`/events/${eventId}/checklist`)
      return data
    },
    enabled: Boolean(eventId) && enabled,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['checklist', eventId] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const addMutation = useMutation({
    mutationFn: (content: string) => checklistApi.add(eventId!, content),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => checklistApi.remove(itemId),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string
      payload: { content?: string; is_done?: boolean }
    }) => checklistApi.update(itemId, payload),
    onSuccess: invalidate,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    add: (content: string) => addMutation.mutateAsync(content),
    remove: (itemId: string) => removeMutation.mutateAsync(itemId),
    update: (itemId: string, payload: { content?: string; is_done?: boolean }) =>
      updateMutation.mutateAsync({ itemId, payload }),
    isMutating: addMutation.isPending || removeMutation.isPending || updateMutation.isPending,
  }
}