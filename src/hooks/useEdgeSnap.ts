import { useCallback } from 'react'
import { useUiStore, BUBBLE_DIMENSIONS } from '@/store/uiStore'
import type { SnapSide } from '@/types'

export function useEdgeSnap() {
  const snapBubble = useUiStore((s) => s.snapBubble)
  const setSnapSide = useUiStore((s) => s.setSnapSide)

  const snapToEdge = useCallback(
    (currentX: number): { x: number; side: SnapSide } => {
      const pos = snapBubble(currentX)
      const centerX = currentX + BUBBLE_DIMENSIONS.size / 2
      const side: SnapSide = centerX < window.innerWidth / 2 ? 'left' : 'right'
      setSnapSide(side)
      return { x: pos.x, side }
    },
    [snapBubble, setSnapSide],
  )

  return { snapToEdge }
}
