import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Message } from '@/types'
import { QUICK_REACTIONS } from '@/utils/emojis'
import { EmojiPickerPopup } from '@/components/common/EmojiPickerPopup'

export interface AnchorRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

interface MessageContextMenuProps {
  message: Message
  isSelf: boolean
  anchorRect: AnchorRect
  onClose: () => void
  onReply: (msg: Message) => void
  onSelect: (msg: Message) => void
  onForward: (msg: Message) => void
  onCopy: (msg: Message) => void
  onReact: (msg: Message, emoji: string) => void
  onDelete: (msg: Message, forAll: boolean) => void
  onEdit?: (msg: Message) => void
}

const ReplyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
)

const ForwardIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="15 17 20 12 15 7" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
  </svg>
)

const SelectIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const DeleteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const REACTIONS = [...QUICK_REACTIONS]
const PAD = 8

function clampMenuPosition(
  menuW: number,
  menuH: number,
  anchor: AnchorRect,
  isSelf: boolean,
): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = isSelf ? anchor.right - menuW : anchor.left
  left = Math.max(PAD, Math.min(left, vw - menuW - PAD))

  let top = anchor.top - menuH - 6
  if (top < PAD) {
    top = anchor.bottom + 6
  }
  if (top + menuH > vh - PAD) {
    top = Math.max(PAD, vh - menuH - PAD)
  }

  return { left, top }
}

export function MessageContextMenu({
  message,
  isSelf,
  anchorRect,
  onClose,
  onReply,
  onSelect,
  onForward,
  onCopy,
  onReact,
  onDelete,
  onEdit,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const moreReactionsRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos(clampMenuPosition(width, height, anchorRect, isSelf))
  }, [anchorRect, isSelf])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)
    document.addEventListener('keydown', handleEsc)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const canEdit = isSelf && message.messageType === 'text'

  const menuItems = [
    { label: 'Reply', icon: <ReplyIcon />, action: () => onReply(message) },
    ...(canEdit && onEdit ? [{ label: 'Edit', icon: <EditIcon />, action: () => onEdit(message) }] : []),
    { label: 'Select messages', icon: <SelectIcon />, action: () => onSelect(message) },
    { label: 'Forward', icon: <ForwardIcon />, action: () => onForward(message) },
    { label: 'Copy', icon: <CopyIcon />, action: () => onCopy(message) },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      role="dialog"
      aria-label="Message options"
    >
      <div
        ref={menuRef}
        data-overlay-interactive
        className="animate-context-menu-in pointer-events-auto absolute flex flex-col gap-1"
        style={{
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          visibility: pos ? 'visible' : 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="glass-menu flex items-center gap-0.5 px-1.5 py-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(message, emoji)
                onClose()
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-transform duration-150 hover:scale-110 hover:bg-white/10"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            ref={moreReactionsRef}
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-[#A0A4A8] transition-colors hover:bg-white/10 hover:text-white"
            aria-label="More reactions"
            aria-expanded={showEmojiPicker}
          >
            +
          </button>
        </div>

        {showEmojiPicker && (
          <EmojiPickerPopup
            anchorRef={moreReactionsRef}
            onSelect={(emoji) => {
              onReact(message, emoji)
              onClose()
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        <div className="glass-menu flex flex-col overflow-hidden p-0.5" role="menu">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.action()
                onClose()
              }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] leading-tight text-white transition-colors duration-150 hover:bg-white/10"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-70">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="mx-1.5 my-0.5 h-px bg-white/10" />

          {isSelf ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete(message, true)
                  onClose()
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] leading-tight text-[#E53E3E] hover:bg-[#E53E3E]/10"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"><DeleteIcon /></span>
                Delete for everyone
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete(message, false)
                  onClose()
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] leading-tight text-[#E53E3E] hover:bg-[#E53E3E]/10"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"><DeleteIcon /></span>
                Delete for me
              </button>
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDelete(message, false)
                onClose()
              }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] leading-tight text-[#E53E3E] hover:bg-[#E53E3E]/10"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"><DeleteIcon /></span>
              Delete for me
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
