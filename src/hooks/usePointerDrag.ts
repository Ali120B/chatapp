import { useCallback, useRef } from 'react'
import type { Position } from '@/types'
import { BUBBLE_DIMENSIONS } from '@/store/uiStore'

const CLICK_THRESHOLD = 5

function getViewportLimits(bounds: { width: number; height: number }) {
  return {
    maxX: window.innerWidth - bounds.width,
    maxY: window.innerHeight - bounds.height,
  }
}

interface UsePointerDragOptions {
  position: Position
  onMove: (pos: Position) => void
  onDragEnd: (pos: Position, wasClick: boolean) => void
  onDragStart?: () => void
  disabled?: boolean
  bounds?: { width: number; height: number }
  shouldStart?: (e: React.PointerEvent) => boolean
}

export function usePointerDrag({
  position,
  onMove,
  onDragEnd,
  onDragStart,
  disabled = false,
  bounds = { width: BUBBLE_DIMENSIONS.size, height: BUBBLE_DIMENSIONS.size },
  shouldStart,
}: UsePointerDragOptions) {
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: -1,
  })

  const clamp = useCallback(
    (x: number, y: number): Position => {
      const { maxX, maxY } = getViewportLimits(bounds)
      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      }
    },
    [bounds.height, bounds.width],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (shouldStart && !shouldStart(e))) return
      e.currentTarget.setPointerCapture(e.pointerId)
      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
        pointerId: e.pointerId,
      }
      onDragStart?.()
    },
    [disabled, position, onDragStart, shouldStart],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.isDragging) return
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      onMove(clamp(dragState.current.originX + dx, dragState.current.originY + dy))
    },
    [clamp, onMove],
  )

  const finishDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.isDragging) return
      e.currentTarget.releasePointerCapture(e.pointerId)
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      const wasClick = Math.hypot(dx, dy) < CLICK_THRESHOLD
      const finalPos = clamp(
        dragState.current.originX + dx,
        dragState.current.originY + dy,
      )
      dragState.current.isDragging = false
      onDragEnd(finalPos, wasClick)
    },
    [clamp, onDragEnd],
  )

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finishDrag,
    handlePointerCancel: finishDrag,
  }
}
