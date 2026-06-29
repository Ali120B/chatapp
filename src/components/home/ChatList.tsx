import { ChatContextMenu } from '@/components/chat/ChatContextMenu'
import type { Chat } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useUiStore } from '@/store/uiStore'
import { buildChatContextMenuItems } from '@/utils/chatContextItems'
import { getChatDisplayName } from '@/utils/chatDisplay'
import { useState } from 'react'

interface ChatListProps {
  chats: Chat[]
  onSelectChat: (chatId: string) => void
  deleteMode?: boolean
  selectedChatIds?: Set<string>
  onToggleChatSelect?: (chatId: string) => void
}

export function ChatList({
  chats,
  onSelectChat,
  deleteMode = false,
  selectedChatIds = new Set<string>(),
  onToggleChatSelect,
}: ChatListProps) {
  const clearChat = useChatStore((s) => s.clearChat)
  const leaveChat = useChatStore((s) => s.leaveChat)
  const deleteChat = useChatStore((s) => s.deleteChat)
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const activeView = useUiStore((s) => s.activeView)
  const isWindowOpen = useUiStore((s) => s.isWindowOpen)
  const user = useAuthStore((s) => s.user)
  const friends = useFriendsStore((s) => s.friends)
  const [contextChat, setContextChat] = useState<Chat | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

  if (!user) return null

  const profileById = new Map(friends.map((friend) => [friend.userId, friend]))

  if (chats.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-[#A0A4A8]">
        No conversations yet
      </div>
    )
  }

  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
    if (deleteMode) return
    e.preventDefault()
    setContextChat(chat)
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const contextItems = contextChat
    ? buildChatContextMenuItems(contextChat, {
        clearChat,
        deleteChat,
        leaveChat,
      })
    : []

  return (
    <>
      <ul className="scroll-thin stagger-children flex-1 overflow-y-auto px-2" role="list">
        {chats.map((chat) => {
          const isViewing = isWindowOpen && activeView === 'chat' && activeChatId === chat.$id
          const unread = isViewing ? 0 : (unreadCounts[chat.$id] ?? 0)
          const displayName = getChatDisplayName(chat, user, profileById)
          return (
          <li key={chat.$id}>
            <button
              type="button"
              onPointerDown={(e) => {
                // Ensure left click
                if (e.button !== 0) return;
                if (deleteMode) {
                  onToggleChatSelect?.(chat.$id)
                  return
                }
                onSelectChat(chat.$id)
              }}
              onContextMenu={(e) => handleContextMenu(e, chat)}
              className={`glass-chip mb-1.5 flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-all duration-200 hover:bg-white/8 ${
                deleteMode && selectedChatIds.has(chat.$id)
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12'
                  : ''
              }`}
              aria-pressed={deleteMode ? selectedChatIds.has(chat.$id) : undefined}
            >
              {deleteMode && (
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    selectedChatIds.has(chat.$id)
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/25 text-[var(--color-accent)]'
                      : 'border-white/25 text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-sm font-medium text-[var(--color-accent)]">
                {displayName[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-white">
                    {displayName}
                  </span>
                  {chat.type === 'group_temp' && (
                    <span className="text-[10px] text-[#A0A4A8]">temp</span>
                  )}
                </div>
                <p className="truncate text-xs text-[#A0A4A8]">
                  {chat.lastMessage ?? 'No messages yet'}
                </p>
              </div>
              {unread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
          </li>
          )
        })}
      </ul>

      {contextChat && menuPos && (
        <ChatContextMenu
          position={menuPos}
          items={contextItems}
          onClose={() => {
            setContextChat(null)
            setMenuPos(null)
          }}
        />
      )}
    </>
  )
}
