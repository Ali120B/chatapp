import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MessageReactions } from '@/utils/reactions'
import { useFriendsStore } from '@/store/friendsStore'

interface ReactionPopupProps {
  reactions: MessageReactions
  currentUserId: string
  anchorRect: DOMRect
  onClose: () => void
  onRemoveReaction: (emoji: string) => void
}

export function ReactionPopup({
  reactions,
  currentUserId,
  anchorRect,
  onClose,
  onRemoveReaction,
}: ReactionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const friends = useFriendsStore((s) => s.friends)

  const getName = (userId: string) => {
    if (userId === currentUserId) return 'You'
    return friends.find((f) => f.userId === userId)?.username ?? 'User'
  }

  useEffect(() => {
    const el = popupRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Position above the anchor, shifted left to avoid overflow
    let left = anchorRect.left - width + anchorRect.width
    left = Math.max(4, Math.min(left, vw - width - 4))

    let top = anchorRect.top - height - 6
    if (top < 4) top = anchorRect.bottom + 6
    if (top + height > vh - 4) top = Math.max(4, vh - height - 4)

    setPos({ left, top })
  }, [anchorRect])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 10)
    document.addEventListener('keydown', handleEsc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0)
  if (entries.length === 0) return null

  return createPortal(
    <div
      ref={popupRef}
      data-overlay-interactive
      className="animate-context-menu-in glass-menu fixed z-[9999] min-w-[140px] max-w-[200px] p-1"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-0.5 px-2 text-[10px] font-medium text-[#A0A4A8]">
        {entries.reduce((sum, [, u]) => sum + u.length, 0)} reaction{entries.reduce((sum, [, u]) => sum + u.length, 0) !== 1 ? 's' : ''}
      </p>
      {entries.map(([emoji, users]) => (
        <div key={emoji}>
          {users.map((uid) => (
            <button
              key={uid}
              type="button"
              data-overlay-interactive
              onMouseUp={(e) => {
                e.stopPropagation()
                onRemoveReaction(emoji)
                onClose()
              }}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] transition-colors hover:bg-white/10"
            >
              <span className="text-white">{getName(uid)}</span>
              <span className="ml-auto shrink-0 text-[9px] text-[#A0A4A8]">
                {uid === currentUserId ? 'remove' : ''}
              </span>
              <span className="shrink-0 text-sm">{emoji}</span>
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  )
}
