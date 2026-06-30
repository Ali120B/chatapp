import { useEffect, useRef, useState } from 'react'
import { ChatHeader } from './ChatHeader'
import { ChatContextMenu } from './ChatContextMenu'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { CreatePollModal } from './CreatePollModal'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { FloatingMenu } from '@/components/common/FloatingMenu'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useUiStore } from '@/store/uiStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useTypingStore } from '@/store/typingStore'
import { buildChatContextMenuItems } from '@/utils/chatContextItems'
import { getChatDisplayName } from '@/utils/chatDisplay'
import type { Message } from '@/types'

function shouldOpenChatContextMenu(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-message-row]')) return false
  if (target.closest('input, textarea, button, [role="menu"], [data-no-drag]')) return false
  return true
}

export function ChatView() {
  const user = useAuthStore((s) => s.user)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const chats = useChatStore((s) => s.chats)
  const messagesByChatId = useChatStore((s) => s.messagesByChatId)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const editMessage = useChatStore((s) => s.editMessage)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const decryptContent = useChatStore((s) => s.decryptContent)
  const leaveChat = useChatStore((s) => s.leaveChat)
  const clearChat = useChatStore((s) => s.clearChat)
  const deleteChat = useChatStore((s) => s.deleteChat)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const reactToMessage = useChatStore((s) => s.reactToMessage)
  const sendPoll = useChatStore((s) => s.sendPoll)
  const votePoll = useChatStore((s) => s.votePoll)
  const addPollOptionToMessage = useChatStore((s) => s.addPollOptionToMessage)
  const setView = useUiStore((s) => s.setView)
  const startForward = useUiStore((s) => s.startForward)
  const [showMenu, setShowMenu] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [replyPreviewText, setReplyPreviewText] = useState('')
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editingText, setEditingText] = useState<string | undefined>(undefined)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())
  const [chatContextMenuPos, setChatContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showPollModal, setShowPollModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const friends = useFriendsStore((s) => s.friends)
  const loadFriends = useFriendsStore((s) => s.loadFriends)
  const typingUsersByChatId = useTypingStore((s) => s.typingUsersByChatId)
  const menuRef = useRef<HTMLButtonElement>(null)

  const chat = chats.find((c) => c.$id === activeChatId)
  const messages = activeChatId ? (messagesByChatId[activeChatId] ?? []) : []
  const isGroup = chat?.type === 'group_temp' || chat?.type === 'group_persist'
  const selectedMessages = messages.filter((message) => selectedMessageIds.has(message.$id))

  const typingUsers = activeChatId
    ? (typingUsersByChatId[activeChatId] ?? []).filter((u) => u.userId !== user?.userId)
    : []

  const getAvatar = (userId: string) => {
    if (userId === user?.userId) return user.avatarUrl
    return friends.find((f) => f.userId === userId)?.avatarUrl ?? ''
  }

  const getSenderName = (userId: string) => {
    if (userId === user?.userId) return 'You'
    return friends.find((f) => f.userId === userId)?.username ?? 'User'
  }

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  // Continuously mark messages as read while viewing this chat
  useEffect(() => {
    if (!activeChatId || !user) return
    void markMessagesRead(activeChatId)
    const interval = setInterval(() => void markMessagesRead(activeChatId), 3_000)
    return () => clearInterval(interval)
  }, [activeChatId, user?.userId])

  const handleLoadMore = async () => {
    if (!activeChatId || loadingMore) return
    setLoadingMore(true)
    await loadMessages(activeChatId, true)
    setLoadingMore(false)
  }

  const handleReply = async (message: Message) => {
    setReplyTo(message)
    const text = message.isEncrypted ? await decryptContent(message) : message.content
    setReplyPreviewText(text)
  }

  const handleEdit = async (message: Message) => {
    const text = message.isEncrypted ? await decryptContent(message) : message.content
    setEditingMessage(message)
    setEditingText(text)
    setReplyTo(null)
    setReplyPreviewText('')
  }

  const handleStartSelectionMode = (message: Message) => {
    setShowMenu(false)
    setReplyTo(null)
    setEditingMessage(null)
    setSelectionMode(true)
    setSelectedMessageIds(new Set([message.$id]))
  }

  const handleToggleMessageSelect = (message: Message) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(message.$id)) next.delete(message.$id)
      else next.add(message.$id)
      return next
    })
  }

  const clearSelectionMode = () => {
    setSelectionMode(false)
    setSelectedMessageIds(new Set())
    setShowBulkDeleteModal(false)
  }

  const handleBulkCopy = async () => {
    if (selectedMessages.length === 0) return
    const text = (
      await Promise.all(
        selectedMessages.map(async (message) =>
          message.isEncrypted ? await decryptContent(message) : message.content,
        ),
      )
    ).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  const handleBulkDelete = async (forAll: boolean) => {
    if (!activeChatId || selectedMessages.length === 0) return
    const messagesToDelete = forAll
      ? selectedMessages.filter((message) => message.senderId === user?.userId)
      : selectedMessages

    for (const message of messagesToDelete) {
      await deleteMessage(activeChatId, message.$id, forAll)
    }
    clearSelectionMode()
  }

  const handleOpenBulkForward = () => {
    if (!activeChatId || selectedMessages.length === 0) return
    startForward(
      activeChatId,
      selectedMessages.map((m) => m.$id),
      'chat',
    )
    clearSelectionMode()
  }

  const handleForwardSingle = (message: Message) => {
    startForward(message.chatId, [message.$id], 'chat')
  }

  if (!user || !chat) return null

  const profileById = new Map(friends.map((friend) => [friend.userId, friend]))
  const displayName = getChatDisplayName(chat, user, profileById)
  const ownSelectedCount = selectedMessages.filter((message) => message.senderId === user.userId).length
  const canDeleteForEveryone = ownSelectedCount > 0 && ownSelectedCount === selectedMessages.length

  const chatContextItems = buildChatContextMenuItems(chat, {
    clearChat,
    deleteChat,
    leaveChat,
    onAfterDelete: () => setView('home'),
    onAfterLeave: () => setView('home'),
  })

  const menuItems = [
  ...(isGroup
    ? [
        {
          label: 'Group info',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
          onClick: () => setView('groupDetails'),
        },
      ]
    : []),
    {
      label: 'Clear chat',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      onClick: () => {
        if (activeChatId) void clearChat(activeChatId)
      },
    },
    {
      label: 'Delete chat',
      danger: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      onClick: () => {
        void deleteChat(chat.$id)
        setView('home')
      },
    },
    ...(isGroup
      ? [
          {
            label: 'Leave group',
            danger: true,
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            ),
            onClick: () => {
              void leaveChat(chat.$id)
              setView('home')
            },
          },
        ]
      : []),
  ]

  const typingText = typingUsers.length === 0
    ? null
    : typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : typingUsers.length === 2
        ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
        : `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`

  return (
    <div
      className="animate-slide-left flex h-full min-h-0 flex-col"
      onContextMenu={(e) => {
        if (!shouldOpenChatContextMenu(e.target)) return
        e.preventDefault()
        setChatContextMenuPos({ x: e.clientX, y: e.clientY })
      }}
    >
      <ChatHeader
        chatName={displayName}
        onBack={() => setView('home')}
        onDetails={() => setView('groupDetails')}
        onMenu={() => setShowMenu((v) => !v)}
        menuButtonRef={menuRef}
        isGroup={isGroup}
      />

      {typingText && (
        <div className="animate-fade-in shrink-0 px-3 pb-1 text-[10px] text-[#A0A4A8]">
          {typingText}
        </div>
      )}

      {showMenu && (
        <FloatingMenu
          items={menuItems}
          onClose={() => setShowMenu(false)}
          anchorRef={menuRef}
        />
      )}

      {selectionMode && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-2xl bg-white/6 px-3 py-2 text-[11px] text-white">
          <span className="min-w-0 flex-1 truncate">
            {selectedMessageIds.size > 0
              ? `${selectedMessageIds.size} message${selectedMessageIds.size === 1 ? '' : 's'} selected`
              : 'Select messages to manage in bulk'}
          </span>
          <button
            type="button"
            onClick={() => void handleBulkCopy()}
            disabled={selectedMessageIds.size === 0}
            className="text-[11px] text-white/90 disabled:opacity-40"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleOpenBulkForward}
            disabled={selectedMessageIds.size === 0}
            className="text-[11px] text-white/90 disabled:opacity-40"
          >
            Forward
          </button>
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            disabled={selectedMessageIds.size === 0}
            className="text-[11px] text-[#E53E3E] disabled:opacity-40"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={clearSelectionMode}
            className="text-[11px] text-[#A0A4A8] transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      <MessageList
        chatId={activeChatId}
        messages={messages}
        currentUserId={user.userId}
        getAvatar={getAvatar}
        getSenderName={getSenderName}
        decryptContent={decryptContent}
        onLoadMore={handleLoadMore}
        hasMore={messages.length >= 50}
        isLoading={loadingMore}
        onReply={(msg) => void handleReply(msg)}
        onEdit={(msg) => void handleEdit(msg)}
        onForward={handleForwardSingle}
        onStartSelectionMode={handleStartSelectionMode}
        selectionMode={selectionMode}
        selectedMessageIds={selectedMessageIds}
        onToggleMessageSelect={handleToggleMessageSelect}
        onDelete={(msg, forAll) => {
          if (activeChatId) void deleteMessage(activeChatId, msg.$id, forAll)
        }}
        onReact={(msg, emoji) => {
          if (activeChatId) void reactToMessage(activeChatId, msg.$id, emoji)
        }}
        onVotePoll={async (msg, optionIds) => {
          if (activeChatId) await votePoll(activeChatId, msg.$id, optionIds)
        }}
        onAddPollOption={async (msg, text) => {
          if (activeChatId) await addPollOptionToMessage(activeChatId, msg.$id, text)
        }}
      />

      <MessageInput
        key={editingMessage?.$id ?? 'default'}
        onSend={async (content, file) => {
          if (editingMessage) {
            await editMessage(editingMessage.$id, content)
            setEditingMessage(null)
          } else {
            await sendMessage(content, file, replyTo?.$id ?? null)
            setReplyTo(null)
            setReplyPreviewText('')
          }
        }}
        onCreatePoll={() => setShowPollModal(true)}
        disabled={selectionMode || !user}
        chatId={activeChatId}
        initialText={editingText}
        onCancelEdit={() => {
          setEditingMessage(null)
          setEditingText(undefined)
        }}
        replyPreview={
          replyTo && !editingMessage
            ? {
                senderName: getSenderName(replyTo.senderId),
                content: replyPreviewText.slice(0, 80),
              }
            : null
        }
        onClearReply={() => {
          setReplyTo(null)
          setReplyPreviewText('')
        }}
      />

      {showPollModal && (
        <CreatePollModal
          onClose={() => setShowPollModal(false)}
          onSend={async (poll) => {
            await sendPoll(poll)
            setShowPollModal(false)
          }}
        />
      )}

      {showBulkDeleteModal && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-3"
          data-overlay-interactive
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowBulkDeleteModal(false)
          }}
        >
          <GlassPanel variant="chip" className="w-full max-w-[300px] p-3">
            <h3 className="mb-1 text-sm font-semibold text-white">Delete selected messages</h3>
            <p className="mb-3 text-[11px] text-[#A0A4A8]">
              Choose whether to remove them only for you or for everyone.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleBulkDelete(false)}
                className="glass-chip w-full py-2 text-xs text-white"
              >
                Delete for me
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete(true)}
                disabled={!canDeleteForEveryone}
                className="glass-chip w-full py-2 text-xs text-[#E53E3E] disabled:opacity-40"
              >
                Delete for everyone
              </button>
              {!canDeleteForEveryone && (
                <p className="px-1 text-[10px] text-[#A0A4A8]">
                  `Delete for everyone` only works when all selected messages are yours.
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-full py-1 text-[11px] text-[#A0A4A8] transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {chatContextMenuPos && (
        <ChatContextMenu
          position={chatContextMenuPos}
          onClose={() => setChatContextMenuPos(null)}
          items={chatContextItems}
        />
      )}
    </div>
  )
}
