import type { RefObject } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { canDragFromHeaderTarget, useOverlayDrag } from '@/hooks/useOverlayDrag'

interface HomeHeaderProps {
  avatarUrl: string
  username: string
  searchQuery: string
  onSearchChange: (q: string) => void
  onMenuClick: () => void
  deleteMode?: boolean
  deleteCount?: number
  onDeleteSelected?: () => void
  deleteDisabled?: boolean
  menuButtonRef?: RefObject<HTMLButtonElement | null>
}

export function HomeHeader({
  avatarUrl,
  username,
  searchQuery,
  onSearchChange,
  onMenuClick,
  deleteMode = false,
  deleteCount = 0,
  onDeleteSelected,
  deleteDisabled = false,
  menuButtonRef,
}: HomeHeaderProps) {
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useOverlayDrag({
      shouldStart: (e) => canDragFromHeaderTarget(e.target),
    })

  return (
    <header
      className="flex shrink-0 cursor-grab items-center gap-2 px-3 pt-3 pb-2 active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <Avatar src={avatarUrl} name={username} size="md" className="glass-chip p-0.5" />
      <div className="glass-chip min-w-0 flex-1 px-3 py-1.5">
        <input
          type="search"
          placeholder="Search contacts or groups..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onPointerDown={() => window.electronAPI?.setFocusable?.(true)}
          className="w-full bg-transparent text-xs text-white placeholder-[#A0A4A8] outline-none"
          aria-label="Search contacts or groups"
          data-needs-focus
        />
      </div>
      {deleteMode ? (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="glass-chip shrink-0 px-3 py-2 text-xs font-medium text-[#E53E3E] disabled:opacity-40"
          aria-label={`Delete ${deleteCount} selected chats`}
          disabled={deleteDisabled}
        >
          Delete{deleteCount > 0 ? ` (${deleteCount})` : ''}
        </button>
      ) : (
        <button
          ref={menuButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onMenuClick()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center text-[#A0A4A8] transition-colors duration-200 hover:text-white"
          aria-label="More options"
          aria-haspopup="menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      )}
    </header>
  )
}
