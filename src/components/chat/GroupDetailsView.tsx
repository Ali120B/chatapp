import { useEffect, useState } from 'react'
import { ChatContextMenu } from './ChatContextMenu'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { canDragFromHeaderTarget, useOverlayDrag } from '@/hooks/useOverlayDrag'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useUiStore } from '@/store/uiStore'
import { buildChatContextMenuItems } from '@/utils/chatContextItems'
import { useFriendsStore } from '@/store/friendsStore'
import { Avatar } from '@/components/common/Avatar'
import { useThemeStore } from '@/store/themeStore'
import { getProfilesByIds } from '@/services/users'
import { storage, APPWRITE_CONFIG } from '@/services/appwrite'
import { getChatDisplayName } from '@/utils/chatDisplay'
import type { UserProfile } from '@/types'

type DetailsTab = 'info' | 'members'

function shouldOpenChatContextMenu(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('input, textarea, button, [role="menu"], [data-chat-drag-handle]')) return false
  return true
}

export function GroupDetailsView() {
  const user = useAuthStore((s) => s.user)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const chats = useChatStore((s) => s.chats)
  const messagesByChatId = useChatStore((s) => s.messagesByChatId)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const leaveChat = useChatStore((s) => s.leaveChat)
  const clearChat = useChatStore((s) => s.clearChat)
  const deleteChat = useChatStore((s) => s.deleteChat)
  const addMembersToChat = useChatStore((s) => s.addMembersToChat)
  const removeMemberFromChat = useChatStore((s) => s.removeMemberFromChat)
  const setView = useUiStore((s) => s.setView)
  const friends = useFriendsStore((s) => s.friends)
  const loadFriends = useFriendsStore((s) => s.loadFriends)
  const accentHex = useThemeStore((s) => s.getAccentHex)()
  const [activeTab, setActiveTab] = useState<DetailsTab>('info')
  const [searchMembers, setSearchMembers] = useState('')
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [extraProfiles, setExtraProfiles] = useState<UserProfile[]>([])
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set())
  const [memberMenu, setMemberMenu] = useState<{
    x: number
    y: number
    userId: string
    username: string
  } | null>(null)
  const [updatingMembers, setUpdatingMembers] = useState(false)

  const chat = chats.find((c) => c.$id === activeChatId)

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  useEffect(() => {
    if (!chat || !activeChatId) return
    void loadMessages(activeChatId)
    const known = new Set([user?.userId, ...friends.map((f) => f.userId)])
    const missing = chat.memberIds.filter((id) => !known.has(id))
    if (missing.length === 0) {
      setExtraProfiles([])
      return
    }
    void getProfilesByIds(missing).then(setExtraProfiles)
  }, [chat, activeChatId, friends, user?.userId, loadMessages])

  const profileById = new Map<string, UserProfile>()
  if (user) profileById.set(user.userId, user)
  for (const f of friends) profileById.set(f.userId, f)
  for (const p of extraProfiles) profileById.set(p.userId, p)

  const messages = activeChatId ? (messagesByChatId[activeChatId] ?? []) : []
  const mediaItems = messages
    .filter((m) => m.imageFileId)
    .map((m) => ({
      id: m.$id,
      url: String(storage.getFileView(APPWRITE_CONFIG.storageBucket, m.imageFileId!)),
    }))

  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useOverlayDrag({
      shouldStart: (e) => canDragFromHeaderTarget(e.target),
    })

  if (!user || !chat) return null

  const isGroup = chat.type === 'group_temp' || chat.type === 'group_persist'
  const memberCount = chat.memberIds?.length ?? 0
  const isAdmin = (chat.adminIds ?? chat.memberIds?.slice(0, 1) ?? []).includes(user.userId)
  const displayName = getChatDisplayName(chat, user, profileById)
  const availableFriends = friends.filter((friend) => !(chat.memberIds ?? []).includes(friend.userId))

  const members = (chat.memberIds ?? []).map((id) => {
    const adminIds = chat.adminIds ?? chat.memberIds?.slice(0, 1) ?? []
    const profile = profileById.get(id)
    if (id === user.userId) {
      return { ...user, isAdmin: adminIds.includes(id), isYou: true, status: '' }
    }
    return {
      userId: id,
      username: profile?.username ?? `User ${id.slice(0, 6)}`,
      avatarUrl: profile?.avatarUrl ?? '',
      isAdmin: adminIds.includes(id),
      isYou: false,
      status: '',
    }
  })

  const filteredMembers = searchMembers
    ? members.filter((m) => m.username.toLowerCase().includes(searchMembers.toLowerCase()))
    : members

  const groupInitial = displayName[0]?.toUpperCase() ?? '?'

  const chatContextItems = buildChatContextMenuItems(chat, {
    clearChat,
    deleteChat,
    leaveChat,
    onAfterDelete: () => setView('home'),
    onAfterLeave: () => setView('home'),
  })

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev)
      if (next.has(friendId)) next.delete(friendId)
      else next.add(friendId)
      return next
    })
  }

  const handleAddMembers = async () => {
    if (!activeChatId || selectedFriendIds.size === 0 || updatingMembers) return
    setUpdatingMembers(true)
    try {
      await addMembersToChat(activeChatId, [...selectedFriendIds])
      setSelectedFriendIds(new Set())
      setShowAddMembers(false)
    } finally {
      setUpdatingMembers(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!activeChatId || updatingMembers) return
    setUpdatingMembers(true)
    try {
      await removeMemberFromChat(activeChatId, memberId)
      setMemberMenu(null)
    } finally {
      setUpdatingMembers(false)
    }
  }

  return (
    <div
      className="animate-slide-left flex h-full flex-col"
      onContextMenu={(e) => {
        if (!shouldOpenChatContextMenu(e.target)) return
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      }}
    >
      {/* Header */}
      <header
        className="flex shrink-0 cursor-grab items-center gap-2 px-3 pt-3 pb-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <button
          type="button"
          onClick={() => setView('chat')}
          className="glass-chip flex h-8 w-8 items-center justify-center text-[#A0A4A8] transition-colors duration-200 hover:text-white"
          aria-label="Close group details"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className="text-sm font-medium text-white">
          {isGroup ? 'Group info' : 'Contact info'}
        </span>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {activeTab === 'info' ? (
          <div className="animate-fade-in flex flex-col px-3">
            {/* Profile section */}
            <div className="flex flex-col items-center py-3">
              <div
                className="mb-2 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundColor: `${accentHex}33` }}
              >
                <span style={{ color: accentHex }}>{groupInitial}</span>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{displayName}</h3>
              </div>
              {isGroup && (
                <p className="text-xs" style={{ color: accentHex }}>
                  Group · {memberCount} members
                </p>
              )}
            </div>

            {/* Description */}
            <GlassPanel variant="chip" className="mb-2 p-3">
              <p className="text-xs italic text-[#A0A4A8]">
                {isGroup ? '"Stay connected, stay awesome!"' : 'No bio set'}
              </p>
            </GlassPanel>

            {/* Media section */}
            <GlassPanel variant="chip" className="mb-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white">Media, links and docs</span>
                <span className="text-[10px] text-[#A0A4A8]">{mediaItems.length}</span>
              </div>
              {mediaItems.length > 0 ? (
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {mediaItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5"
                    >
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-[#A0A4A8]">No photos shared yet</p>
              )}
            </GlassPanel>

            {/* Settings items */}
            <div className="flex flex-col gap-0.5">
              {[
                { icon: '⭐', label: 'Starred messages' },
                { icon: '🔔', label: 'Notification settings' },
                { icon: '🔒', label: 'Encryption', sub: 'Messages are end-to-end encrypted.' },
                { icon: '⏱️', label: 'Disappearing messages', sub: 'Off' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
                >
                  <span className="text-sm">{item.icon}</span>
                  <div>
                    <p className="text-xs text-white">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-[#A0A4A8]">{item.sub}</p>}
                  </div>
                </button>
              ))}
            </div>

            {/* View members button */}
            {isGroup && (
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
              >
                <span className="text-sm">👥</span>
                <span className="text-xs text-white">{memberCount} members</span>
                <svg className="ml-auto h-3 w-3 text-[#A0A4A8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}

            {/* Danger zone */}
            <div className="mt-3 mb-3 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (activeChatId) void clearChat(activeChatId)
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#E53E3E] transition-colors duration-150 hover:bg-[#E53E3E]/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span className="text-xs">Clear chat</span>
              </button>
              {isGroup && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeChatId) {
                      void leaveChat(activeChatId)
                      setView('home')
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#E53E3E] transition-colors duration-150 hover:bg-[#E53E3E]/10"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="text-xs">Exit group</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Members tab */
          <div className="animate-slide-left flex flex-col px-3">
            {/* Members header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="flex items-center gap-1.5 text-xs text-[#A0A4A8] transition-colors duration-200 hover:text-white"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>
              <span className="text-xs text-[#A0A4A8]">{memberCount} members</span>
            </div>

            {/* Search members */}
            <div className="glass-chip mb-2 px-3 py-1.5">
              <input
                type="search"
                placeholder="Search members..."
                value={searchMembers}
                onChange={(e) => setSearchMembers(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-[#A0A4A8] outline-none"
                aria-label="Search members"
              />
            </div>

            {/* Add member button (admins only) */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddMembers((prev) => !prev)}
                  className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${accentHex}33` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentHex} strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <span className="text-xs text-white">Add member</span>
                </button>
                {showAddMembers && (
                  <GlassPanel variant="chip" className="mb-2 p-2">
                    {availableFriends.length > 0 ? (
                      <>
                        <div className="scroll-thin mb-2 max-h-32 space-y-1 overflow-y-auto">
                          {availableFriends.map((friend) => (
                            <button
                              key={friend.userId}
                              type="button"
                              onClick={() => toggleFriendSelection(friend.userId)}
                              className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
                                selectedFriendIds.has(friend.userId)
                                  ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <Avatar src={friend.avatarUrl} name={friend.username} size="sm" />
                              <span className="min-w-0 flex-1 truncate text-xs text-white">{friend.username}</span>
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                  selectedFriendIds.has(friend.userId)
                                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                    : 'border-white/20 text-transparent'
                                }`}
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMembers(false)
                              setSelectedFriendIds(new Set())
                            }}
                            className="glass-chip flex-1 py-2 text-[11px] text-[#A0A4A8]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAddMembers()}
                            disabled={selectedFriendIds.size === 0 || updatingMembers}
                            className="glass-chip flex-1 py-2 text-[11px] text-[var(--color-accent)] disabled:opacity-40"
                          >
                            {updatingMembers ? 'Adding...' : 'Add selected'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="px-1 py-2 text-[11px] text-[#A0A4A8]">No more friends to add.</p>
                    )}
                  </GlassPanel>
                )}
              </>
            )}

            {/* Member list */}
            <div className="flex flex-col gap-0.5">
              {filteredMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/5"
                  onContextMenu={(e) => {
                    if (!isAdmin || member.isYou) return
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenuPos(null)
                    setMemberMenu({
                      x: e.clientX,
                      y: e.clientY,
                      userId: member.userId,
                      username: member.username,
                    })
                  }}
                >
                  <Avatar src={member.avatarUrl} name={member.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-white">
                        {member.isYou ? 'You' : member.username}
                      </span>
                    </div>
                    {member.status && (
                      <p className="truncate text-[10px] text-[#A0A4A8]">{member.status}</p>
                    )}
                  </div>
                  {member.isAdmin && (
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${accentHex}22`, color: accentHex }}
                    >
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom actions */}
            <div className="mt-3 mb-3 flex flex-col gap-0.5">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
              >
                <span className="text-sm">📋</span>
                <span className="text-xs text-white">View member changes</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
              >
                <span className="text-sm">❤️</span>
                <span className="text-xs text-white">Add to favourites</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {contextMenuPos && (
        <ChatContextMenu
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          items={chatContextItems}
        />
      )}
      {memberMenu && (
        <ChatContextMenu
          position={{ x: memberMenu.x, y: memberMenu.y }}
          onClose={() => setMemberMenu(null)}
          items={[
            {
              label: `Remove ${memberMenu.username}`,
              danger: true,
              onClick: () => {
                void handleRemoveMember(memberMenu.userId)
              },
            },
          ]}
        />
      )}
    </div>
  )
}
