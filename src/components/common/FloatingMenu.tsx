import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface FloatingMenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

interface FloatingMenuProps {
  items: FloatingMenuItem[]
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

const PAD = 8
const MENU_W = 168

export function FloatingMenu({ items, onClose, anchorRef }: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!anchor || !menu) return

    const rect = anchor.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.right - menuRect.width
    if (left < PAD) left = rect.left
    left = Math.max(PAD, Math.min(left, vw - menuRect.width - PAD))

    let top = rect.bottom + 4
    if (top + menuRect.height > vh - PAD) {
      top = rect.top - menuRect.height - 4
    }
    top = Math.max(PAD, Math.min(top, vh - menuRect.height - PAD))

    setPos({ left, top })
  }, [anchorRef, items.length])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
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
      ref={menuRef}
      data-overlay-interactive
      className="animate-scale-in glass-menu fixed z-[9999] flex flex-col overflow-hidden p-1"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        minWidth: MENU_W,
      }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] transition-colors duration-150 hover:bg-white/10
            ${item.danger ? 'text-[#E53E3E]' : 'text-white'}`}
        >
          {item.icon && (
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-70">
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
