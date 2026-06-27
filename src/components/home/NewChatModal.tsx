import { useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useUiStore } from '@/store/uiStore'
import { appwriteChatService } from '@/services/chats'
import { Avatar } from '@/components/common/Avatar'

interface NewChatModalProps {
  onClose: () => void
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const friends = useFriendsStore((s) => s.friends)
  const loadChats = useChatStore((s) => s.loadChats)
  const selectChat = useChatStore((s) => s.selectChat)
  const setView = useUiStore((s) => s.setView)
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [starting, setStarting] = useState(false)

  const filtered = friends.filter((friend) =>
    friend.username.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const handleStartChat = async (friend: { userId: string; username: string }) => {
    if (!user || starting) return
    setStarting(true)
    try {
      const chat = await appwriteChatService.getOrCreateDm(user.userId, friend.userId, friend.username)
      await loadChats()
      const chats = useChatStore.getState().chats
      if (!chats.some((c) => c.$id === chat.$id)) {
        useChatStore.setState({ chats: [chat, ...chats] })
      }
      selectChat(chat.$id)
      setView('chat')
      onClose()
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <GlassPanel variant="chip" className="w-full max-w-[320px] p-3">
        <h3 className="mb-2 text-sm font-semibold text-white">New Chat</h3>
        <GlassPanel variant="pill" className="mb-2 px-3 py-2">
          <input
            type="search"
            placeholder="Search friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
            aria-label="Search friends"
            data-needs-focus
          />
        </GlassPanel>
        <ul className="scroll-thin mb-3 max-h-40 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((friend) => (
              <li key={friend.userId}>
                <button
                  type="button"
                  onClick={() => void handleStartChat(friend)}
                  disabled={starting}
                  className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white transition-colors hover:bg-white/8 disabled:opacity-40"
                >
                  <Avatar src={friend.avatarUrl} name={friend.username} size="xs" />
                  {friend.username}
                </button>
              </li>
            ))
          ) : (
            <li className="px-2 py-3 text-xs text-[#A0A4A8]">No friends found. Add friends first.</li>
          )}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="glass-chip w-full py-2 text-xs text-[#A0A4A8]"
        >
          Cancel
        </button>
      </GlassPanel>
    </div>
  )
}
