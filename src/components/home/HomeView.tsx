import { useEffect, useRef, useState } from 'react'
import { HomeHeader } from './HomeHeader'
import { ChatList } from './ChatList'
import { CreateGroupModal } from './CreateGroupModal'
import { NewChatModal } from './NewChatModal'
import { BottomNavPill } from '@/components/nav/BottomNavPill'
import { FloatingMenu } from '@/components/common/FloatingMenu'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useUiStore } from '@/store/uiStore'
import { getChatDisplayName } from '@/utils/chatDisplay'

type CreateModal = 'chat' | 'group' | 'temp' | null

export function HomeView() {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const searchQuery = useChatStore((s) => s.searchQuery)
  const setSearchQuery = useChatStore((s) => s.setSearchQuery)
  const loadChats = useChatStore((s) => s.loadChats)
  const selectChat = useChatStore((s) => s.selectChat)
  const deleteChat = useChatStore((s) => s.deleteChat)
  const setView = useUiStore((s) => s.setView)
  const activeTab = useUiStore((s) => s.activeTab)
  const setTab = useUiStore((s) => s.setTab)
  const loadFriends = useFriendsStore((s) => s.loadFriends)
  const friends = useFriendsStore((s) => s.friends)
  const [showMenu, setShowMenu] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [createModal, setCreateModal] = useState<CreateModal>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLButtonElement>(null)
  const createRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    void loadChats()
    void loadFriends()
  }, [loadChats, loadFriends])

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId)
    setView('chat')
  }

  const handleToggleDeleteMode = () => {
    setShowMenu(false)
    setDeleteMode(true)
    setSelectedChatIds(new Set())
  }

  const handleToggleChatSelect = (chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(chatId)) next.delete(chatId)
      else next.add(chatId)
      return next
    })
  }

  const handleDeleteChats = async () => {
    for (const id of selectedChatIds) {
      await deleteChat(id)
    }
    setSelectedChatIds(new Set())
    setDeleteMode(false)
  }

  const handleCancelDeleteMode = () => {
    setSelectedChatIds(new Set())
    setDeleteMode(false)
  }

  if (!user) return null

  const profileById = new Map(friends.map((friend) => [friend.userId, friend]))
  const filtered = chats.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return getChatDisplayName(c, user, profileById).toLowerCase().includes(q)
  })

  const menuItems = [
    {
      label: 'Delete chats',
      danger: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      onClick: handleToggleDeleteMode,
    },
  ]

  const createMenuItems = [
    {
      label: 'New chat',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      onClick: () => setCreateModal('chat'),
    },
    {
      label: 'New group',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6" />
          <path d="M23 11h-6" />
        </svg>
      ),
      onClick: () => setCreateModal('group'),
    },
    {
      label: 'Temp group',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      onClick: () => setCreateModal('temp'),
    },
  ]

  return (
    <div className="animate-fade-in relative flex h-full flex-col">
      <HomeHeader
        avatarUrl={user.avatarUrl}
        username={user.username}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setShowMenu((v) => !v)}
        deleteMode={deleteMode}
        deleteCount={selectedChatIds.size}
        onDeleteSelected={() => void handleDeleteChats()}
        deleteDisabled={selectedChatIds.size === 0}
        menuButtonRef={menuRef}
      />

      {showMenu && (
        <FloatingMenu items={menuItems} onClose={() => setShowMenu(false)} anchorRef={menuRef} />
      )}

      {deleteMode && (
        <div className="mx-3 mb-2 flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2 text-[11px] text-[#D3D6DA]">
          <span>Select one or more chats, then press Delete.</span>
          <button
            type="button"
            onClick={handleCancelDeleteMode}
            className="text-xs font-medium text-white transition-colors hover:text-[var(--color-accent)]"
          >
            Cancel
          </button>
        </div>
      )}

      <ChatList
        chats={filtered}
        onSelectChat={handleSelectChat}
        deleteMode={deleteMode}
        selectedChatIds={selectedChatIds}
        onToggleChatSelect={handleToggleChatSelect}
      />

      {!deleteMode && (
        <button
          ref={createRef}
          type="button"
          onClick={() => setShowCreateMenu((v) => !v)}
          className="glass-chip absolute right-4 bottom-[4.75rem] z-10 flex h-11 w-11 items-center justify-center text-[var(--color-accent)] shadow-lg transition-transform duration-200 hover:scale-105"
          aria-label="Create new chat or group"
          aria-haspopup="menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {showCreateMenu && (
        <FloatingMenu
          items={createMenuItems}
          onClose={() => setShowCreateMenu(false)}
          anchorRef={createRef}
        />
      )}

      <div className="shrink-0 pb-3 pt-1">
        {!deleteMode && <BottomNavPill active={activeTab} onChange={setTab} />}
      </div>

      {createModal === 'chat' && <NewChatModal onClose={() => setCreateModal(null)} />}
      {(createModal === 'group' || createModal === 'temp') && (
        <CreateGroupModal
          variant={createModal === 'temp' ? 'temp' : 'group'}
          onClose={() => setCreateModal(null)}
        />
      )}
    </div>
  )
}
