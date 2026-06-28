import { useEffect, useMemo, useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useUiStore } from '@/store/uiStore'
import { MOCK_USERS } from '@/services/mock/data'
import { getChatDisplayName } from '@/utils/chatDisplay'
import type { Message } from '@/types'

export function ForwardView() {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const friends = useFriendsStore((s) => s.friends)
  const messagesByChatId = useChatStore((s) => s.messagesByChatId)
  const forwardMessages = useChatStore((s) => s.forwardMessages)
  const selectChat = useChatStore((s) => s.selectChat)
  const decryptContent = useChatStore((s) => s.decryptContent)
  const forwardPayload = useUiStore((s) => s.forwardPayload)
  const clearForward = useUiStore((s) => s.clearForward)
  const setView = useUiStore((s) => s.setView)
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)

  const sourceMessages = useMemo(() => {
    if (!forwardPayload) return []
    const all = messagesByChatId[forwardPayload.sourceChatId] ?? []
    return all
      .filter((m) => forwardPayload.messageIds.includes(m.$id))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
  }, [forwardPayload, messagesByChatId])

  const profileById = useMemo(() => new Map(friends.map((f) => [f.userId, f])), [friends])

  const targets = chats.filter((chat) => {
    if (!forwardPayload || chat.$id === forwardPayload.sourceChatId) return false
    const displayName = user ? getChatDisplayName(chat, user, profileById) : ''
    if (!query.trim()) return true
    return displayName.toLowerCase().includes(query.toLowerCase())
  })

  const handleCancel = () => {
    const returnView = forwardPayload?.returnView ?? 'chat'
    clearForward()
    setView(returnView)
  }

  const handleForwardTo = async (targetChatId: string) => {
    if (!forwardPayload || sending) return
    setSending(true)
    try {
      await forwardMessages(
        forwardPayload.sourceChatId,
        forwardPayload.messageIds,
        targetChatId,
      )
      clearForward()
      selectChat(targetChatId)
      setView('chat')
    } finally {
      setSending(false)
    }
  }

  if (!user || !forwardPayload) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[#A0A4A8]">
        Nothing to forward.
      </div>
    )
  }

  const getSenderName = (senderId: string) => {
    if (senderId === user.userId) return 'You'
    const mock = MOCK_USERS.find((u) => u.userId === senderId)
    return mock?.username ?? 'User'
  }

  return (
    <div className="animate-slide-left flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/6 px-3 py-3">
        <button
          type="button"
          onClick={handleCancel}
          className="glass-chip flex h-8 w-8 items-center justify-center text-[#A0A4A8] hover:text-white"
          aria-label="Cancel forward"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-white">Forward to…</h2>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-3 py-2">
        <GlassPanel variant="chip" className="mb-3 p-2.5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
            {sourceMessages.length} message{sourceMessages.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-col gap-1.5">
            {sourceMessages.map((message) => (
              <MessagePreview
                key={message.$id}
                senderName={getSenderName(message.senderId)}
                message={message}
                decryptContent={decryptContent}
              />
            ))}
          </div>
        </GlassPanel>

        <div className="glass-chip mb-2 px-3 py-1.5">
          <input
            type="search"
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-[#A0A4A8] outline-none"
            aria-label="Search chats to forward to"
            data-needs-focus
          />
        </div>

        <ul className="flex flex-col gap-1" role="list">
          {targets.length > 0 ? (
            targets.map((chat) => {
              const displayName = user ? getChatDisplayName(chat, user, profileById) : 'Direct Message'
              return (
                <li key={chat.$id}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleForwardTo(chat.$id)}
                    className="glass-chip mb-1 flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-white/8 disabled:opacity-40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-sm font-medium text-[var(--color-accent)]">
                      {(displayName)[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="truncate text-sm text-white">{displayName}</span>
                  </button>
                </li>
              )
            })
          ) : (
            <li className="py-4 text-center text-xs text-[#A0A4A8]">No chats match your search.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

function MessagePreview({
  senderName,
  message,
  decryptContent,
}: {
  senderName: string
  message: Message
  decryptContent: (message: Message) => Promise<string>
}) {
  const [text, setText] = useState(message.isEncrypted ? '…' : message.content)

  useEffect(() => {
    if (!message.isEncrypted) {
      setText(message.content)
      return
    }
    void decryptContent(message).then(setText)
  }, [message, decryptContent])

  return (
    <div className="rounded-xl bg-white/5 px-2 py-1.5">
      <p className="text-[10px] font-medium text-[var(--color-accent)]">{senderName}</p>
      <p className="truncate text-xs text-[#D3D6DA]">{text}</p>
    </div>
  )
}
