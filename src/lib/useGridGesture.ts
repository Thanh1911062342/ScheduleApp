/**
 * Máy trạng thái cử chỉ cho lưới lịch.
 *
 *   idle
 *     │ pointerdown
 *     ▼
 *   pending ──pointermove > 8px──► selecting ──pointerup──► vùng chọn
 *     │                              ▲
 *     │ 500ms                        │
 *     ▼                              │
 *   longpress ───────────────────────┘ (kéo tiếp sau long-press
 *     │                                  → huỷ popup, chuyển sang chọn vùng)
 *     ▼
 *   mở popup tạo lịch
 *     ▲
 *   pointerup < 500ms ──► click → mở panel ngày
 *
 * Bốn chi tiết bắt buộc để không lỗi trên mobile:
 *  1. `touch-action: none` trên lưới (CSS, class `touch-none-grid`).
 *     Thiếu nó thì trình duyệt cuộn trang và nuốt pointermove.
 *  2. `preventDefault` cho `contextmenu` — nếu không, iOS/Android bật menu
 *     "Copy / Search" khi ấn giữ.
 *  3. `setPointerCapture` — để vẫn nhận pointermove/up khi ngón tay ra ngoài ô.
 *  4. Chặn sự kiện `click` tổng hợp mà trình duyệt bắn ra sau pointerup.
 *     Không chặn thì panel ngày sẽ mở đè lên popup vừa hiện.
 *
 * Trạng thái cử chỉ được giữ trong `useRef` chứ không phải `useState`, vì
 * `pointerup` đọc giá trị này và state của React có thể còn cũ trong closure.
 * `useState` chỉ dùng để render (highlight vùng chọn).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export const LONG_PRESS_MS = 500
export const MOVE_TOLERANCE_PX = 8

export type GesturePhase = 'idle' | 'pending' | 'longpress' | 'selecting'

export interface GestureHandlers {
  onLongPress: (date: string) => void
  onSelectRange: (startDate: string, endDate: string) => void
  onTap: (date: string) => void
}

export interface GestureState {
  phase: GesturePhase
  /** Ngày đang được trỏ tới trong lúc kéo chọn. */
  hoverDate: string | null
  /** Ngày bắt đầu vùng chọn. */
  anchorDate: string | null
  /** Ô vừa long-press, để chạy animation phản hồi. */
  pressedDate: string | null
}

const IDLE: GestureState = {
  phase: 'idle',
  hoverDate: null,
  anchorDate: null,
  pressedDate: null,
}

interface GestureRef {
  phase: GesturePhase
  originX: number
  originY: number
  anchorDate: string
  hoverDate: string | null
  pointerId: number
}

export interface UseGridGestureResult {
  state: GestureState
  gridProps: {
    onPointerDown: (event: React.PointerEvent) => void
    onPointerMove: (event: React.PointerEvent) => void
    onPointerUp: (event: React.PointerEvent) => void
    onPointerCancel: (event: React.PointerEvent) => void
    onContextMenu: (event: React.MouseEvent) => void
    onClickCapture: (event: React.MouseEvent) => void
  }
}

/** Đọc `data-date` của ô ngày dưới con trỏ. */
function dateFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>('[data-date]')?.dataset.date ?? null
}

export function useGridGesture(handlers: GestureHandlers): UseGridGestureResult {
  const [state, setState] = useState<GestureState>(IDLE)

  const gestureRef = useRef<GestureRef | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cờ chặn cú `click` tổng hợp bắn ra ngay sau pointerup.
  const suppressClickRef = useRef(false)

  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const releaseCapture = useCallback((pointerId: number) => {
    const el = document.activeElement
    try {
      if (el instanceof HTMLElement && el.hasPointerCapture?.(pointerId)) {
        el.releasePointerCapture(pointerId)
      }
    } catch {
      // capture có thể đã tự nhả — không phải lỗi chặn.
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    gestureRef.current = null
    setState(IDLE)
  }, [clearTimer])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Bỏ qua chuột phải / chuột giữa.
      if (event.pointerType === 'mouse' && event.button !== 0) return

      const date = dateFromTarget(event.target)
      if (!date) return

      // Giữ pointer capture để vẫn nhận move/up khi ra ngoài ô.
      try {
        ;(event.target as Element)
          .closest<HTMLElement>('[data-date]')
          ?.setPointerCapture(event.pointerId)
      } catch {
        // Trình duyệt cũ có thể không hỗ trợ — vẫn chạy, chỉ kém chính xác.
      }

      gestureRef.current = {
        phase: 'pending',
        originX: event.clientX,
        originY: event.clientY,
        anchorDate: date,
        hoverDate: date,
        pointerId: event.pointerId,
      }
      suppressClickRef.current = false
      setState({ phase: 'pending', hoverDate: date, anchorDate: null, pressedDate: null })

      clearTimer()
      timerRef.current = setTimeout(() => {
        const gesture = gestureRef.current
        if (!gesture || gesture.phase !== 'pending') return

        // Hết 500ms mà chưa nhả, chưa kéo xa -> long press.
        gesture.phase = 'longpress'
        suppressClickRef.current = true
        setState((prev) =>
          prev.phase === 'pending' ? { ...prev, phase: 'longpress', pressedDate: gesture.anchorDate } : prev,
        )

        // Phản hồi rung, nếu máy hỗ trợ.
        try {
          navigator.vibrate?.(10)
        } catch {
          // không phải lỗi chặn
        }

        handlersRef.current.onLongPress(gesture.anchorDate)
      }, LONG_PRESS_MS)
    },
    [clearTimer],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const gesture = gestureRef.current
      if (!gesture) return

      const moved =
        Math.abs(event.clientX - gesture.originX) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - gesture.originY) > MOVE_TOLERANCE_PX

      const date = dateFromTarget(event.target)

      if (!moved) return

      // Kéo trước HOẶC sau long-press đều chuyển sang chọn vùng.
      if (gesture.phase === 'pending' || gesture.phase === 'longpress') {
        clearTimer()
        gesture.phase = 'selecting'
        setState({
          phase: 'selecting',
          anchorDate: gesture.anchorDate,
          hoverDate: date ?? gesture.hoverDate,
          pressedDate: null,
        })
        return
      }

      if (gesture.phase === 'selecting' && date && date !== gesture.hoverDate) {
        gesture.hoverDate = date
        setState((prev) => ({ ...prev, hoverDate: date }))
      }
    },
    [clearTimer],
  )

  const onPointerUp = useCallback(() => {
    const gesture = gestureRef.current
    if (!gesture) return

    if (gesture.phase === 'selecting') {
      suppressClickRef.current = true
      const end = gesture.hoverDate ?? gesture.anchorDate
      const anchor = gesture.anchorDate
      releaseCapture(gesture.pointerId)
      reset()
      handlersRef.current.onSelectRange(anchor, end)
      return
    }

    if (gesture.phase === 'longpress') {
      // Popup đã mở ở bước long-press; chỉ dọn trạng thái.
      suppressClickRef.current = true
      releaseCapture(gesture.pointerId)
      reset()
      return
    }

    // phase === 'pending' -> nhả trước 500ms, coi là click thường.
    const date = gesture.anchorDate
    releaseCapture(gesture.pointerId)
    reset()
    handlersRef.current.onTap(date)
  }, [reset, releaseCapture])

  const onPointerCancel = useCallback(() => {
    const gesture = gestureRef.current
    if (gesture) releaseCapture(gesture.pointerId)
    reset()
  }, [reset, releaseCapture])

  /** Chặn menu ngữ cảnh của trình duyệt khi ấn giữ trên mobile. */
  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
  }, [])

  /**
   * Chặn `click` tổng hợp bắn ra sau long-press hoặc sau khi kéo chọn.
   * Không có bước này thì panel ngày sẽ mở đè lên popup vừa hiện.
   */
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
    }
  }, [])

  return {
    state,
    gridProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
      onClickCapture,
    },
  }
}