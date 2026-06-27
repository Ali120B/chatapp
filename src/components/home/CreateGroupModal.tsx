import { useRef, useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { useChatStore } from '@/store/chatStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useUiStore } from '@/store/uiStore'

interface CreateGroupModalProps {
  onClose: () => void
  variant?: 'group' | 'temp'
}

export function CreateGroupModal({ onClose, variant = 'temp' }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const friends = useFriendsStore((s) => s.friends)
  const createGroup = useChatStore((s) => s.createGroup)
  const selectChat = useChatStore((s) => s.selectChat)
  const setView = useUiStore((s) => s.setView)
  const [creating, setCreating] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const focusNameInput = () => {
    window.electronAPI?.setFocusable?.(true)
    nameInputRef.current?.focus()
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!name.trim() || selected.size === 0) return
    setCreating(true)
    try {
      const chat = await createGroup(
        name.trim(),
        [...selected],
        variant === 'temp' ? 'group_temp' : 'group_persist',
      )
      selectChat(chat.$id)
      setView('chat')
      onClose()
    } finally {
      setCreating(false)
    }
  }

  const isTemp = variant === 'temp'
  const title = isTemp ? 'Create Temp Group' : 'Create Group'

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <GlassPanel variant="chip" className="w-full max-w-[320px] p-3">
        <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
        {isTemp && (
          <p className="mb-2 text-[11px] text-[#A0A4A8]">Temporary groups expire after 24 hours.</p>
        )}
        <GlassPanel variant="pill" className="mb-2 px-3 py-2">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPointerDown={(e) => {
              e.stopPropagation()
              focusNameInput()
            }}
            onClick={focusNameInput}
            className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
            aria-label="Group name"
            data-needs-focus
          />
        </GlassPanel>
        <p className="mb-1 text-xs text-[#A0A4A8]">Select friends</p>
        <ul className="scroll-thin mb-3 max-h-32 overflow-y-auto">
          {friends.map((f) => (
            <li key={f.userId}>
              <button
                type="button"
                onClick={() => toggle(f.userId)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm
                  ${selected.has(f.userId) ? 'bg-[#00B4FF]/20 text-[#00B4FF]' : 'text-white hover:bg-white/8'}`}
              >
                <img src={f.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                {f.username}
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
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim() || selected.size === 0}
            className="glass-chip flex-1 py-2 text-xs text-[#00B4FF] disabled:opacity-40"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
