import { useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import type { Chat } from '@/types'

interface DeleteChatsModalProps {
  chats: Chat[]
  onClose: () => void
  onDelete: (chatIds: string[]) => void
}

export function DeleteChatsModal({ chats, onClose, onDelete }: DeleteChatsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="animate-fade-in absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Delete chats"
      data-overlay-interactive
    >
      <GlassPanel variant="window" className="flex max-h-[85%] w-full flex-col p-3 animate-scale-in">
        <h3 className="mb-1 text-sm font-semibold text-white">Delete chats</h3>
        <p className="mb-3 text-[10px] text-[#A0A4A8]">
          Removes the conversation from your list. You won&apos;t leave groups or block anyone.
        </p>

        <ul className="scroll-thin mb-3 flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <li key={chat.$id}>
              <button
                type="button"
                onClick={() => toggle(chat.$id)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs transition-colors duration-150
                  ${selected.has(chat.$id) ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-white hover:bg-white/5'}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border
                    ${selected.has(chat.$id) ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/30' : 'border-white/30'}`}
                >
                  {selected.has(chat.$id) && '✓'}
                </span>
                <span className="truncate">{chat.name ?? 'Direct Message'}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="glass-chip flex-1 py-2 text-xs text-[#A0A4A8]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              onDelete([...selected])
              onClose()
            }}
            className="glass-chip flex-1 py-2 text-xs text-[#E53E3E] disabled:opacity-40"
          >
            Delete ({selected.size})
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
