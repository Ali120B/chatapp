import type { ReactNode } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { CHAT_WINDOW, useUiStore } from '@/store/uiStore'

interface ChatWindowProps {
  children: ReactNode
}

export function ChatWindow({ children }: ChatWindowProps) {
  const isWindowOpen = useUiStore((s) => s.isWindowOpen)

  if (!isWindowOpen) return null

  return (
    <div
      data-overlay-interactive
      className="absolute bottom-0 left-0 z-60 animate-scale-in"
      style={{
        width: CHAT_WINDOW.width,
        height: CHAT_WINDOW.height,
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
