/**
 * Lưới giờ 24h dùng chung cho chế độ Ngày (1 cột) và Tuần (7 cột),
 * kiểu Google Calendar (xem image.png).
 *
 * Cử chỉ trên vùng trống của lưới:
 *  - Bấm vào một ô giờ -> tạo sự kiện bắt đầu giờ đó, dài 1 tiếng.
 *  - Ấn-giữ rồi KÉO từ ô này sang ô khác (ví dụ 8 AM xuống 12 PM)
 *    -> mở form với đúng khung giờ đã kéo, không phải chỉnh tay trong form.
 *
 * Cử chỉ trên KHỐI sự kiện (khi truyền `onCopyEventTo`):
 *  - Ctrl + giữ chuột PHẢI rồi kéo sang vị trí khác trong lưới ->
 *    sao chép sự kiện tới đúng NGÀY + GIỜ thả chuột (bám nấc 30 phút,
 *    không bắt buộc giữ khung giờ gốc). Trong lúc kéo có khối "bóng mờ"
 *    xem trước ở vị trí đích, và menu chuột phải bị chặn.
 *
 * Zoom (chỉ bật khi truyền `onZoomChange`):
 *  - Mức to nhất = 52px/giờ (kích thước mặc định ban đầu).
 *  - Mức nhỏ nhất = vừa khít để nhìn trọn 24h trong khung hiện tại,
 *    giúp xem toàn cảnh lịch trình một ngày/tuần.
 *  - Nút +/- nổi ở góc phải; sidebar ngày (DayPanel) không dùng zoom.
 *
 * Căn chỉnh:
 *  - Tiêu đề cột + dải "Cả ngày" nằm TRONG cùng vùng cuộn và sticky,
 *    nên luôn thẳng hàng tuyệt đối với cột lưới bên dưới (không lệch
 *    do thanh cuộn).
 *  - Nhãn giờ nằm đúng tâm của đường kẻ giờ (translate -50%).
 *  - Có vạch mờ ở mốc 30 phút và đường đỏ "bây giờ" cho ngày hôm nay.
 *  - Sự kiện trùng giờ được chia cột nằm cạnh nhau thay vì chồng đè.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { formatTime, timeToMinutes } from '@/lib/date'
import type { Occurrence } from '@/types'

const MAX_HOUR_HEIGHT = 52
const TOTAL_HOURS = 24
const SNAP_MINUTES = 30
const MIN_BLOCK_MINUTES = 25
const GUTTER_WIDTH = 56
/** Chiều cao tối thiểu tuyệt đối của một giờ để khối vẫn bấm được. */
const FLOOR_HOUR_HEIGHT = 16
const ZOOM_STEP = 0.25

export interface TimeGridColumn {
  dateString: string
  occurrences: Occurrence[]
  isToday?: boolean
  /** Nội dung hàng tiêu đề phía trên cột (khung Tuần: thứ + số ngày). */
  header?: ReactNode
}

interface TimeGridProps {
  columns: TimeGridColumn[]
  onOpenEvent: (occurrence: Occurrence) => void
  onCreateRange: (dateString: string, startMinutes: number, endMinutes: number) => void
  /** Mức zoom 0 (thu nhỏ tối đa) .. 1 (kích thước mặc định). Mặc định 1. */
  zoom?: number
  /** Có mặt thì bật nút zoom; bỏ trống (sidebar ngày) thì không hiện. */
  onZoomChange?: (zoom: number) => void
  /** Ctrl + chuột phải kéo khối sự kiện tới ngày/giờ khác -> sao chép.
   * `startMinutes` = giờ bắt đầu mới (null với sự kiện cả ngày). */
  onCopyEventTo?: (
    occurrence: Occurrence,
    targetDateString: string,
    startMinutes: number | null,
  ) => void
  className?: string
}

interface TimedBlock {
  occurrence: Occurrence
  startMinutes: number
  endMinutes: number
  top: number
  height: number
}

/** Khối đã xếp chỗ: nằm ở cột thứ `col` trong tổng `cols` cột của cụm trùng giờ. */
interface PlacedBlock extends TimedBlock {
  col: number
  cols: number
}

interface DragState {
  dateString: string
  startMinutes: number
  currentMinutes: number
}

/** Trạng thái kéo sao chép khối sự kiện (Ctrl + chuột phải). */
interface CopyDragState {
  occurrence: Occurrence
  sourceDate: string
  /** Giờ bắt đầu gốc của khối (phút), để biết drop tại chỗ thì bỏ qua. */
  sourceStartMinutes: number
  /** Cột ngày con trỏ đang nằm trên; null khi kéo ra ngoài lưới. */
  targetDate: string | null
  /** Giờ bắt đầu MỚI (đã snap 30 phút) tại cột đích; null khi ở ngoài lưới. */
  targetStartMinutes: number | null
  /** Thời lượng khối (phút) — giữ nguyên khi sao chép. */
  durationMinutes: number
  /** Con trỏ đang "cắm" vào phút thứ mấy của khối khi bắt đầu kéo. */
  grabOffsetMinutes: number
  pointerId: number
}

function clampZoom(zoom: number): number {
  return Math.min(1, Math.max(0, zoom))
}

function snapMinutes(rawMinutes: number): number {
  const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES
  return Math.min(TOTAL_HOURS * 60, Math.max(0, snapped))
}

function minutesFromPointer(
  event: React.PointerEvent,
  element: HTMLElement,
  hourHeight: number,
): number {
  const rect = element.getBoundingClientRect()
  const y = event.clientY - rect.top
  return snapMinutes((y / hourHeight) * 60)
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function splitOccurrences(occurrences: Occurrence[], hourHeight: number): {
  allDay: Occurrence[]
  timed: TimedBlock[]
} {
  const allDay: Occurrence[] = []
  const timed: TimedBlock[] = []

  for (const occ of occurrences) {
    if (occ.is_all_day || !occ.start_time) {
      allDay.push(occ)
      continue
    }

    // Sự kiện nhiều ngày: ngày tiếp nối bắt đầu từ 0:00, ngày đầu kết thúc 24:00.
    const continuesFromBefore = occ.start_date < occ.occurrence_date
    const continuesAfter = occ.end_date > occ.occurrence_date

    const startMinutes = continuesFromBefore ? 0 : (timeToMinutes(occ.start_time) ?? 0)
    let endMinutes = continuesAfter
      ? TOTAL_HOURS * 60
      : (timeToMinutes(occ.end_time) ?? startMinutes + 60)

    // Qua nửa đêm trong cùng ngày (end <= start): kéo tới hết ngày.
    if (!continuesAfter && endMinutes <= startMinutes) {
      endMinutes = TOTAL_HOURS * 60
    }

    timed.push({
      occurrence: occ,
      startMinutes,
      endMinutes,
      top: (startMinutes / 60) * hourHeight,
      height: (Math.max(MIN_BLOCK_MINUTES, endMinutes - startMinutes) / 60) * hourHeight,
    })
  }

  timed.sort((a, b) => a.startMinutes - b.startMinutes)
  return { allDay, timed }
}

/**
 * Xếp các khối trùng giờ thành cụm, trong cụm chia cột theo thuật toán tham lam:
 * khối mới vào cột đầu tiên còn trống (kết thúc trước khi nó bắt đầu).
 */
function placeBlocks(blocks: TimedBlock[]): PlacedBlock[] {
  const placed: PlacedBlock[] = []
  let cluster: TimedBlock[] = []
  let clusterEnd = -1

  function flushCluster() {
    if (cluster.length === 0) return
    const columnEnds: number[] = []
    const inCluster: PlacedBlock[] = []
    for (const block of cluster) {
      let col = columnEnds.findIndex((end) => end <= block.startMinutes)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(block.endMinutes)
      } else {
        columnEnds[col] = block.endMinutes
      }
      inCluster.push({ ...block, col, cols: 1 })
    }
    const cols = columnEnds.length
    for (const item of inCluster) {
      placed.push({ ...item, cols })
    }
    cluster = []
    clusterEnd = -1
  }

  for (const block of blocks) {
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) flushCluster()
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.endMinutes)
  }
  flushCluster()
  return placed
}

export function TimeGrid({
  columns,
  onOpenEvent,
  onCreateRange,
  zoom = 1,
  onZoomChange,
  onCopyEventTo,
  className,
}: TimeGridProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [copyDrag, setCopyDrag] = useState<CopyDragState | null>(null)
  /**
   * Chặn menu chuột phải của trình duyệt trong lúc đang kéo sao chép.
   * `contextmenu` bắn ra SAU `pointerup` (React đã gỡ listener), nên phải
   * chặn ở cấp window bằng ref, và giữ thêm một nhịp sau khi thả.
   */
  const suppressCtxRef = useRef(false)
  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      if (suppressCtxRef.current) event.preventDefault()
    }
    window.addEventListener('contextmenu', onContextMenu, true)
    return () => window.removeEventListener('contextmenu', onContextMenu, true)
  }, [])

  // Đo chiều cao khung nhìn + header để tính mức zoom nhỏ nhất (trọn 24h).
  const [viewportH, setViewportH] = useState(0)
  const [headerH, setHeaderH] = useState(0)

  // "Bây giờ" — cập nhật mỗi phút để đường đỏ chỉ giờ hiện tại chạy đúng.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Chiều cao một giờ theo mức zoom hiện tại.
  const hourHeight = useMemo(
    () => computeHourHeight(viewportH, headerH, zoom),
    [viewportH, headerH, zoom],
  )

  // Khối sự kiện phải dùng đúng hourHeight sau khi đã đo khung.
  const columnData = useMemo(
    () => columns.map((col) => ({ ...col, ...splitOccurrences(col.occurrences, hourHeight) })),
    [columns, hourHeight],
  )

  const hasHeaders = columns.some((c) => c.header != null)
  const hasAllDay = columnData.some((c) => c.allDay.length > 0)

  // Đo lại khi khung/header đổi kích thước (đổi zoom, resize cửa sổ, mở panel).
  useEffect(() => {
    function measure() {
      if (scrollRef.current) setViewportH(scrollRef.current.clientHeight)
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (scrollRef.current) ro.observe(scrollRef.current)
    if (headerRef.current) ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [hasHeaders, hasAllDay])

  // Nhãn GMT suy ra từ múi giờ trình duyệt.
  const gmtLabel = useMemo(() => {
    const offset = -now.getTimezoneOffset() / 60
    const sign = offset >= 0 ? '+' : '-'
    const absolute = Math.abs(offset)
    const hours = Math.floor(absolute)
    const minutes = Math.round((absolute - hours) * 60)
    return minutes > 0
      ? `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`
      : `GMT${sign}${hours}`
  }, [now])

  // Cuộn tới sự kiện sớm nhất của nhóm ngày đang xem, hoặc 7h nếu trống.
  const columnsKey = columns.map((c) => c.dateString).join('|')
  useEffect(() => {
    if (!scrollRef.current) return
    const tops = columnData.flatMap((c) => c.timed.map((b) => b.top))
    const target = tops.length > 0 ? Math.min(...tops) : 7 * hourHeight
    scrollRef.current.scrollTop = Math.max(0, target - hourHeight)
    // Chỉ cuộn khi đổi nhóm ngày, không cuộn lại mỗi lần refetch/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsKey])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, dateString: string) {
    if ((event.target as HTMLElement).closest('[data-event-block]')) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const minutes = minutesFromPointer(event, event.currentTarget, hourHeight)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Trình duyệt cũ không hỗ trợ — vẫn chạy, chỉ kém chính xác khi ra ngoài cột.
    }
    setDrag({ dateString, startMinutes: minutes, currentMinutes: minutes })
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const minutes = minutesFromPointer(event, event.currentTarget, hourHeight)
    setDrag((prev) => (prev ? { ...prev, currentMinutes: minutes } : prev))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const { dateString, startMinutes, currentMinutes } = drag
    setDrag(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // capture có thể đã tự nhả
    }

    const low = Math.min(startMinutes, currentMinutes)
    const high = Math.max(startMinutes, currentMinutes)

    if (high - low < SNAP_MINUTES) {
      onCreateRange(dateString, low, Math.min(low + 60, TOTAL_HOURS * 60))
    } else {
      onCreateRange(dateString, low, high)
    }
  }

  // --- Kéo sao chép khối sự kiện (Ctrl + chuột phải) --------------------------

  /** Tìm phần tử cột ngày (data-day-column) nằm dưới toạ độ con trỏ. */
  function columnElementAtPoint(clientX: number, clientY: number): HTMLElement | null {
    const el = document.elementFromPoint(clientX, clientY)
    const col = el?.closest('[data-day-column]')
    return col instanceof HTMLElement ? col : null
  }

  /** Phút (đã snap 30') tại toạ độ con trỏ trong một cột ngày. */
  function minutesInColumn(clientY: number, column: HTMLElement): number {
    const rect = column.getBoundingClientRect()
    return snapMinutes(((clientY - rect.top) / hourHeight) * 60)
  }

  function handleBlockPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    block: PlacedBlock,
  ) {
    const isCopyGesture =
      event.pointerType === 'mouse' && event.button === 2 && event.ctrlKey
    if (!isCopyGesture || !onCopyEventTo) return
    event.preventDefault()
    event.stopPropagation()
    suppressCtxRef.current = true
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // bỏ qua — vẫn kéo được, chỉ kém chính xác khi ra ngoài khối
    }
    // Con trỏ "cắm" vào phút thứ mấy của khối — giữ nguyên khi kéo
    // để bóng mờ không bị nhảy lên đầu khối.
    const column = event.currentTarget.closest('[data-day-column]')
    const grabOffsetMinutes = column
      ? Math.max(0, minutesInColumn(event.clientY, column as HTMLElement) - block.startMinutes)
      : 0
    setCopyDrag({
      occurrence: block.occurrence,
      sourceDate: block.occurrence.occurrence_date,
      sourceStartMinutes: block.startMinutes,
      targetDate: null,
      targetStartMinutes: null,
      durationMinutes: Math.max(SNAP_MINUTES, block.endMinutes - block.startMinutes),
      grabOffsetMinutes,
      pointerId: event.pointerId,
    })
  }

  /** Vị trí đích (ngày + giờ bắt đầu mới) theo toạ độ con trỏ hiện tại. */
  function resolveCopyTarget(clientX: number, clientY: number): {
    date: string
    startMinutes: number
  } | null {
    const column = columnElementAtPoint(clientX, clientY)
    if (!column) return null
    const date = column.dataset.dayColumn
    if (!date) return null
    if (!copyDrag) return null
    const raw = minutesInColumn(clientY, column) - copyDrag.grabOffsetMinutes
    const startMinutes = Math.min(
      TOTAL_HOURS * 60 - SNAP_MINUTES,
      Math.max(0, snapMinutes(raw)),
    )
    return { date, startMinutes }
  }

  function handleBlockPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!copyDrag || event.pointerId !== copyDrag.pointerId) return
    const target = resolveCopyTarget(event.clientX, event.clientY)
    setCopyDrag((prev) => {
      if (!prev) return prev
      const date = target?.date ?? null
      const start = target?.startMinutes ?? null
      if (date === prev.targetDate && start === prev.targetStartMinutes) return prev
      return { ...prev, targetDate: date, targetStartMinutes: start }
    })
  }

  function endCopyDrag() {
    setCopyDrag(null)
    // contextmenu bắn sau pointerup — giữ chặn thêm một nhịp rồi mới nhả.
    window.setTimeout(() => {
      suppressCtxRef.current = false
    }, 350)
  }

  function handleBlockPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!copyDrag || event.pointerId !== copyDrag.pointerId) return
    const { occurrence, sourceDate, sourceStartMinutes } = copyDrag
    const target = resolveCopyTarget(event.clientX, event.clientY)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // capture có thể đã tự nhả
    }
    endCopyDrag()
    // Bỏ qua nếu thả về đúng chỗ cũ (không ngày mới, không giờ mới).
    const unchanged =
      !target ||
      (target.date === sourceDate && target.startMinutes === sourceStartMinutes)
    if (!unchanged && target) {
      onCopyEventTo?.(occurrence, target.date, target.startMinutes)
    }
  }

  function handleBlockPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
    if (!copyDrag || event.pointerId !== copyDrag.pointerId) return
    endCopyDrag()
  }

  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => i), [])

  return (
    <div className={cn('relative flex min-h-0 flex-col bg-[var(--color-paper)]', className)}>
      {/* Nút zoom — chỉ hiện ở khung Tuần/Ngày (có onZoomChange), không ở sidebar. */}
      {onZoomChange ? (
        <div className="absolute right-3 bottom-3 z-30 flex items-center gap-0.5 rounded-full border border-[var(--color-rule-strong)] bg-[var(--color-paper-raised)] p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.14)]">
          <ZoomButton
            label={t('calendar.zoomOut')}
            disabled={zoom <= 0.001}
            onClick={() => onZoomChange(clampZoom(zoom - ZOOM_STEP))}
          >
            <path d="M5 10h10" />
          </ZoomButton>
          <ZoomButton
            label={t('calendar.zoomIn')}
            disabled={zoom >= 0.999}
            onClick={() => onZoomChange(clampZoom(zoom + ZOOM_STEP))}
          >
            <path d="M10 5v10M5 10h10" />
          </ZoomButton>
        </div>
      ) : null}

      {/* Một vùng cuộn duy nhất: tiêu đề sticky nên luôn thẳng hàng với lưới. */}
      <div ref={scrollRef} className="scroll-thin relative min-h-0 flex-1 overflow-y-auto">
        {/* Tiêu đề cột + dải cả ngày (dính trên cùng khi cuộn) */}
        <div ref={headerRef} className="sticky top-0 z-20 bg-[var(--color-paper)]">
          {hasHeaders ? (
            <div className="flex border-b border-[var(--color-rule)]">
              <div
                className="flex shrink-0 items-start justify-end pb-1 pr-2 pt-2 text-[9px] leading-none text-[var(--color-ink-faint)]"
                style={{ width: `${GUTTER_WIDTH}px` }}
              >
                {gmtLabel}
              </div>
              {columns.map((col) => (
                <div
                  key={col.dateString}
                  className="min-w-0 flex-1 border-l border-[var(--color-rule)]"
                >
                  {col.header}
                </div>
              ))}
            </div>
          ) : null}

          {hasAllDay ? (
            <div className="flex border-b border-[var(--color-rule)]">
              <div
                className="shrink-0 pt-1.5 pr-2 text-right text-[9px] leading-tight text-[var(--color-ink-faint)] uppercase"
                style={{ width: `${GUTTER_WIDTH}px` }}
              >
                {t('calendar.allDayRow')}
              </div>
              {columnData.map((col) => (
                <div
                  key={col.dateString}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 border-l border-[var(--color-rule)] px-1 py-1"
                >
                  {col.allDay.map((occ) => {
                    const color = occ.color ?? occ.calendar.color
                    return (
                      <button
                        key={occ.occurrence_key}
                        type="button"
                        onClick={() => onOpenEvent(occ)}
                        className={cn(
                          'truncate rounded-[4px] px-1.5 py-0.5 text-left text-[10px] leading-tight font-medium',
                          'transition-opacity hover:opacity-80',
                          occ.status === 'done' && 'line-through opacity-60',
                        )}
                        style={{
                          backgroundColor: `color-mix(in srgb, ${color} 16%, var(--color-paper-raised))`,
                          borderLeft: `3px solid ${color}`,
                          color: `color-mix(in srgb, ${color} 55%, var(--color-ink))`,
                        }}
                      >
                        {occ.title}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Lưới 24 giờ */}
        <div className="flex" style={{ height: `${TOTAL_HOURS * hourHeight}px` }}>
          {/* Cột nhãn giờ — nhãn nằm đúng tâm đường kẻ */}
          <div
            className="relative shrink-0 border-t border-[var(--color-rule)]"
            style={{ width: `${GUTTER_WIDTH}px` }}
          >
            {hours.slice(1).map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] leading-none text-[var(--color-ink-faint)] select-none"
                style={{ top: `${hour * hourHeight}px` }}
              >
                <span className="tnum">{formatHourLabel(hour)}</span>
              </div>
            ))}
          </div>

          {/* Các cột ngày */}
          {columnData.map((col) => {
            const placed = placeBlocks(col.timed)
            return (
              <div
                key={col.dateString}
                data-day-column={col.dateString}
                className={cn(
                  'relative min-w-0 flex-1 border-t border-l border-[var(--color-rule)] touch-pan-y select-none',
                  col.isToday && 'bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]',
                  copyDrag && copyDrag.targetDate === col.dateString &&
                    'bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]',
                )}
                title={t('day.timelineHint')}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => handlePointerDown(e, col.dateString)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDrag(null)}
              >
                {/* Đường kẻ giờ + vạch mờ 30 phút */}
                {hours.slice(1).map((hour) => (
                  <div key={hour} className="pointer-events-none absolute inset-x-0">
                    <div
                      className="absolute inset-x-0 border-t border-[var(--color-rule)]"
                      style={{ top: `${hour * hourHeight}px` }}
                    />
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-[var(--color-rule)] opacity-60"
                      style={{ top: `${hour * hourHeight + hourHeight / 2}px` }}
                    />
                  </div>
                ))}

                {/* Khối sự kiện (nền nhạt + viền trái màu, chữ cùng tông màu) */}
                {placed.map((block) => {
                  const occ = block.occurrence
                  const color = occ.color ?? occ.calendar.color
                  const width = 100 / block.cols
                  const isCopySource =
                    copyDrag != null && copyDrag.occurrence.occurrence_key === occ.occurrence_key
                  return (
                    <button
                      key={occ.occurrence_key}
                      type="button"
                      data-event-block
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        handleBlockPointerDown(e, block)
                      }}
                      onPointerMove={handleBlockPointerMove}
                      onPointerUp={handleBlockPointerUp}
                      onPointerCancel={handleBlockPointerCancel}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => {
                        if (suppressCtxRef.current) return
                        onOpenEvent(occ)
                      }}
                      title={
                        onCopyEventTo
                          ? `${t('day.copyDragHint')}`
                          : undefined
                      }
                      className={cn(
                        'absolute overflow-hidden rounded-[5px] px-1.5 text-left',
                        'transition-shadow hover:z-10 hover:shadow-[0_1px_4px_rgba(0,0,0,0.18)]',
                        occ.status === 'done' && 'opacity-55',
                        isCopySource && 'opacity-40 ring-2 ring-[var(--color-accent)]',
                      )}
                      style={{
                        top: `${block.top + 1}px`,
                        height: `${Math.max(block.height - 2, 16)}px`,
                        paddingTop: block.height > 26 ? 3 : 1,
                        paddingBottom: block.height > 26 ? 3 : 1,
                        left: `calc(${block.col * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        backgroundColor: `color-mix(in srgb, ${color} 18%, var(--color-paper-raised))`,
                        borderLeft: `3px solid ${color}`,
                        color: `color-mix(in srgb, ${color} 55%, var(--color-ink))`,
                      }}
                    >
                      <span className="block truncate text-[11px] leading-[1.3] font-medium">
                        {occ.title}
                      </span>
                      {block.height > 32 ? (
                        <span className="tnum block truncate text-[10px] leading-[1.3] opacity-80">
                          {formatTime(occ.start_time)}
                          {occ.end_time ? ` – ${formatTime(occ.end_time)}` : ''}
                        </span>
                      ) : null}
                      {block.height > 56 && occ.location ? (
                        <span className="block truncate text-[10px] leading-[1.3] opacity-70">
                          {occ.location}
                        </span>
                      ) : null}
                    </button>
                  )
                })}

                {/* Đường đỏ "bây giờ" cho ngày hôm nay */}
                {col.isToday ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10"
                    style={{ top: `${(nowMinutes / 60) * hourHeight}px` }}
                  >
                    <div className="relative h-[2px] bg-[#ea4335]">
                      <span className="absolute -top-[4px] -left-[5px] h-[10px] w-[10px] rounded-full bg-[#ea4335]" />
                    </div>
                  </div>
                ) : null}

                {/* Khối xem trước khi đang kéo chọn khoảng giờ */}
                {drag && drag.dateString === col.dateString ? (
                  <DragPreview drag={drag} hourHeight={hourHeight} />
                ) : null}

                {/* "Bóng mờ" của sự kiện đang được kéo sao chép sang vị trí này */}
                {copyDrag &&
                copyDrag.targetDate === col.dateString &&
                copyDrag.targetStartMinutes != null ? (
                  <CopyGhost copyDrag={copyDrag} hourHeight={hourHeight} />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Chiều cao một giờ theo mức zoom.
 *  - zoom 1  -> MAX_HOUR_HEIGHT (kích thước mặc định, to nhất).
 *  - zoom 0  -> vừa đủ để 24h nằm trọn trong khung nhìn (trừ header).
 */
function computeHourHeight(viewportH: number, headerH: number, zoom: number): number {
  if (!viewportH) return MAX_HOUR_HEIGHT
  const available = Math.max(viewportH - headerH, 0)
  const min = Math.min(Math.max(available / TOTAL_HOURS, FLOOR_HOUR_HEIGHT), MAX_HOUR_HEIGHT)
  return min + (MAX_HOUR_HEIGHT - min) * clampZoom(zoom)
}

/** Khối mờ hiển thị khoảng giờ đang kéo, kèm nhãn giờ đầu – cuối. */
function DragPreview({ drag, hourHeight }: { drag: DragState; hourHeight: number }) {
  const low = Math.min(drag.startMinutes, drag.currentMinutes)
  const high = Math.max(drag.startMinutes, drag.currentMinutes)
  const end = high > low ? high : Math.min(low + 60, TOTAL_HOURS * 60)

  return (
    <div
      className="pointer-events-none absolute inset-x-[2px] z-20 overflow-hidden rounded-[5px] border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,var(--color-paper-raised))] px-1.5 py-[3px]"
      style={{
        top: `${(low / 60) * hourHeight + 1}px`,
        height: `${Math.max(((end - low) / 60) * hourHeight - 2, 16)}px`,
      }}
    >
      <span className="tnum block text-[10px] leading-[1.3] font-medium text-[var(--color-accent)]">
        {minutesToLabel(low)} – {minutesToLabel(end)}
      </span>
    </div>
  )
}

/** "Bóng mờ" của khối sự kiện đang được Ctrl+chuột phải kéo sang vị trí mới. */
function CopyGhost({
  copyDrag,
  hourHeight,
}: {
  copyDrag: CopyDragState
  hourHeight: number
}) {
  const color = copyDrag.occurrence.color ?? copyDrag.occurrence.calendar.color
  const start = copyDrag.targetStartMinutes ?? 0
  const end = Math.min(start + copyDrag.durationMinutes, TOTAL_HOURS * 60)
  return (
    <div
      className="pointer-events-none absolute inset-x-[2px] z-20 overflow-hidden rounded-[5px] border border-dashed px-1.5 py-[3px]"
      style={{
        top: `${(start / 60) * hourHeight + 1}px`,
        height: `${Math.max(((end - start) / 60) * hourHeight - 2, 16)}px`,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--color-paper-raised))`,
        color: `color-mix(in srgb, ${color} 55%, var(--color-ink))`,
      }}
    >
      <span className="block truncate text-[11px] leading-[1.3] font-medium">
        {copyDrag.occurrence.title}
      </span>
      <span className="tnum block truncate text-[10px] leading-[1.3] opacity-80">
        {minutesToLabel(start)} – {minutesToLabel(end)}
      </span>
    </div>
  )
}

/** Nút zoom tròn nhỏ (+ / -). */
function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
        'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunken)] hover:text-[var(--color-ink)]',
        disabled && 'pointer-events-none opacity-30',
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  )
}

/** Nhãn giờ kiểu quốc tế: 12 AM / 1 AM … 12 PM / 1 PM. */
function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}
