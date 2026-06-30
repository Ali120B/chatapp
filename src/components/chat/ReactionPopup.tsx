import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MessageReactions } from '@/utils/reactions'
import { useFriendsStore } from '@/store/friendsStore'
import { useAuthStore } from '@/store/authStore'

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
  const user = useAuthStore((s) => s.user)

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

    let left = anchorRect.left + anchorRect.width / 2 - width / 2
    left = Math.max(8, Math.min(left, vw - width - 8))

    let top = anchorRect.top - height - 8
    if (top < 8) top = anchorRect.bottom + 8

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
      className="animate-context-menu-in glass-menu fixed z-[9999] min-w-[160px] max-w-[220px] p-1.5"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="mb-1 px-2 text-[10px] font-medium text-[#A0A4A8]">
        {entries.reduce((sum, [, u]) => sum + u.length, 0)} reaction{entries.reduce((sum, [, u]) => sum + u.length, 0) !== 1 ? 's' : ''}
      </p>
      {entries.map(([emoji, users]) => (
        <div key={emoji} className="mb-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="text-sm">{emoji}</span>
            <span className="text-[10px] text-[#A0A4A8]">{users.length}</span>
          </div>
          {users.map((uid) => (
            <button
              key={uid}
              type="button"
              onClick={() => {
                onRemoveReaction(emoji)
                onClose()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] transition-colors hover:bg-white/10"
            >
              <span className="flex-1 text-white">{getName(uid)}</span>
              <span className="text-[10px] text-[#A0A4A8]">
                {uid === currentUserId ? 'Click to remove' : ''}
              </span>
              <span className="text-sm">{emoji}</span>
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  )
}
