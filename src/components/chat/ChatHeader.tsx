import type { RefObject } from 'react'
import { canDragFromHeaderTarget, useOverlayDrag } from '@/hooks/useOverlayDrag'

interface ChatHeaderProps {
  chatName: string
  onBack: () => void
  onDetails: () => void
  onMenu: () => void
  menuButtonRef?: RefObject<HTMLButtonElement | null>
  isGroup?: boolean
}

export function ChatHeader({
  chatName,
  onBack,
  onDetails,
  onMenu,
  menuButtonRef,
  isGroup,
}: ChatHeaderProps) {
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useOverlayDrag({
      shouldStart: (e) => canDragFromHeaderTarget(e.target),
    })

  return (
    <header
      className="flex shrink-0 cursor-grab items-center justify-between gap-2 px-3 pt-3 pb-1 active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <button
        type="button"
        onClick={onBack}
        className="glass-chip flex h-8 w-8 items-center justify-center text-[#A0A4A8] transition-colors duration-200 hover:text-white"
        aria-label="Go back"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onDetails}
        className="glass-chip min-w-0 flex-1 px-3 py-1.5 text-center transition-colors duration-200 hover:bg-white/8"
        aria-label={isGroup ? `${chatName} group info` : `${chatName} contact info`}
      >
        <span className="block truncate text-sm font-medium text-white">{chatName}</span>
      </button>

      <button
        ref={menuButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onMenu()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="glass-chip flex h-8 w-8 items-center justify-center text-[#A0A4A8] transition-colors duration-200 hover:text-white"
        aria-label="Chat options"
        aria-haspopup="menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </header>
  )
}
