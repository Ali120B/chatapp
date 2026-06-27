import type { ReactNode } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { CHAT_WINDOW, useUiStore } from '@/store/uiStore'
import { computeChatWindowPos } from '@/utils/overlayBounds'

interface ChatWindowProps {
  children: ReactNode
}

export function ChatWindow({ children }: ChatWindowProps) {
  const isWindowOpen = useUiStore((s) => s.isWindowOpen)
  const bubblePos = useUiStore((s) => s.bubblePos)
  const chatPos = computeChatWindowPos(bubblePos)

  if (!isWindowOpen) return null

  return (
    <div
      data-overlay-interactive
      className="fixed z-60 animate-scale-in"
      style={{
        width: CHAT_WINDOW.width,
        height: CHAT_WINDOW.height,
        left: chatPos.left,
        top: chatPos.top,
      }}
      role="dialog"
      aria-label="Chat window"
      aria-modal="true"
    >
      <GlassPanel variant="window" className="relative flex h-full flex-col overflow-hidden glass-text">
        {children}
      </GlassPanel>
    </div>
  )
}
