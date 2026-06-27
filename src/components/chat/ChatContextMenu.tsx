import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ChatContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface ChatContextMenuProps {
  position: { x: number; y: number }
  items: ChatContextMenuItem[]
  onClose: () => void
}

export function ChatContextMenu({ position, items, onClose }: ChatContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const left = Math.min(position.x, window.innerWidth - 190)
  const top = Math.min(position.y, window.innerHeight - items.length * 40 - 20)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      onClose()
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 10)
    document.addEventListener('keydown', handleEsc)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9998]" role="presentation">
      <div
        ref={menuRef}
        data-overlay-interactive
        role="menu"
        className="animate-context-menu-in glass-menu pointer-events-auto absolute flex min-w-[180px] flex-col overflow-hidden p-1"
        style={{ left, top }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={`rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/10 ${
              item.danger ? 'text-[#E53E3E]' : 'text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
