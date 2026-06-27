import { useCallback } from 'react'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { useUiStore } from '@/store/uiStore'

interface UseOverlayDragOptions {
  shouldStart?: (e: React.PointerEvent) => boolean
  onDragEnd?: (pos: { x: number; y: number }, wasClick: boolean) => void
}

/** Drag the entire overlay (bubble + chat) within the fullscreen window. */
export function useOverlayDrag(options: UseOverlayDragOptions = {}) {
  const { shouldStart, onDragEnd: onDragEndExtra } = options
  const bubblePos = useUiStore((s) => s.bubblePos)
  const setBubblePos = useUiStore((s) => s.setBubblePos)
  const setDragging = useUiStore((s) => s.setDragging)

  const onMove = useCallback((pos: { x: number; y: number }) => {
    setBubblePos(pos)
  }, [setBubblePos])

  const onDragEnd = useCallback(
    (pos: { x: number; y: number }, wasClick: boolean) => {
      setDragging(false)
      window.electronAPI?.keepOnTop?.()
      onDragEndExtra?.(pos, wasClick)
    },
    [onDragEndExtra, setDragging],
  )

  return usePointerDrag({
    position: bubblePos,
    onMove,
    onDragEnd,
    onDragStart: () => setDragging(true),
    shouldStart,
  })
}

/** Ignore interactive controls when starting an overlay drag from a header strip. */
export function canDragFromHeaderTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('button, input, textarea, a, [role="menu"], [data-no-drag]')) return false
  return true
}
