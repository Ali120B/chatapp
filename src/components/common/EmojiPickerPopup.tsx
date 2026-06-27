import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EMOJI_CATEGORIES } from '@/utils/emojis'

interface EmojiPickerPopupProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

const PAD = 8
const PICKER_W = 260
const PICKER_H = 280

export function EmojiPickerPopup({ onSelect, onClose, anchorRef }: EmojiPickerPopupProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const picker = pickerRef.current
    if (!anchor || !picker) return

    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.left
    if (left + PICKER_W > vw - PAD) left = rect.right - PICKER_W
    left = Math.max(PAD, Math.min(left, vw - PICKER_W - PAD))

    let top = rect.top - PICKER_H - 6
    if (top < PAD) top = rect.bottom + 6
    top = Math.max(PAD, Math.min(top, vh - PICKER_H - PAD))

    setPos({ left, top })
  }, [anchorRef])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (pickerRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    document.addEventListener('keydown', handleEsc)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, anchorRef])

  return createPortal(
    <div
      ref={pickerRef}
      data-overlay-interactive
      className="animate-scale-in glass-menu fixed z-[10000] flex flex-col overflow-hidden"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        width: PICKER_W,
        maxHeight: PICKER_H,
      }}
      role="listbox"
      aria-label="Emoji picker"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category} className="mb-2 last:mb-0">
            <p className="mb-1 px-0.5 text-[9px] font-medium uppercase tracking-wide text-[#A0A4A8]">
              {category}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojis.map((emoji) => (
                <button
                  key={`${category}-${emoji}`}
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect(emoji)
                    onClose()
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-white/10"
                  aria-label={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}
