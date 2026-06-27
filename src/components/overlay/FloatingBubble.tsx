import { useUiStore } from '@/store/uiStore'
import { useOverlayDrag } from '@/hooks/useOverlayDrag'
import { useThemeStore } from '@/store/themeStore'

interface FloatingBubbleProps {
  unreadCount: number
}

export function FloatingBubble({ unreadCount }: FloatingBubbleProps) {
  const bubblePos = useUiStore((s) => s.bubblePos)
  const isWindowOpen = useUiStore((s) => s.isWindowOpen)
  const activeView = useUiStore((s) => s.activeView)
  const toggleWindow = useUiStore((s) => s.toggleWindow)
  const accentHex = useThemeStore((s) => s.getAccentHex)()

  const hideBadge =
    unreadCount === 0 ||
    (isWindowOpen && activeView === 'chat')

  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useOverlayDrag({
      onDragEnd: (_pos, wasClick) => {
        if (wasClick) toggleWindow()
      },
    })

  return (
    <button
      type="button"
      data-overlay-interactive
      className={`glass-pill fixed z-[70] flex items-center justify-center touch-none select-none shadow-lg
        ${isWindowOpen ? 'ring-2 ring-[var(--color-accent)]/40' : ''}`}
      style={{
        width: 48,
        height: 48,
        left: bubblePos.x,
        top: bubblePos.y,
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={isWindowOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isWindowOpen}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accentHex}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unreadCount > 0 && !hideBadge && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E53E3E] px-1 text-[10px] font-semibold text-white"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
