import { BUBBLE_DIMENSIONS, CHAT_WINDOW } from '@/store/uiStore'

const BUBBLE_OVERLAP = 20
const EDGE = 8

export function computeChatWindowPos(bubblePos: { x: number; y: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const bubbleCenterX = bubblePos.x + BUBBLE_DIMENSIONS.size / 2
  let left = bubbleCenterX - CHAT_WINDOW.width / 2
  left = Math.max(EDGE, Math.min(left, vw - CHAT_WINDOW.width - EDGE))
  let top = bubblePos.y - CHAT_WINDOW.height + BUBBLE_OVERLAP
  top = Math.max(EDGE, Math.min(top, vh - CHAT_WINDOW.height - EDGE))
  return { left, top }
}
