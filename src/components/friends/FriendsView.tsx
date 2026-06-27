import { useEffect } from 'react'
import { FriendSearch } from './FriendSearch'
import { FriendList } from './FriendList'
import { FriendRequests } from './FriendRequests'
import { BottomNavPill } from '@/components/nav/BottomNavPill'
import { useFriendsStore } from '@/store/friendsStore'
import { useChatStore } from '@/store/chatStore'
import { useUiStore } from '@/store/uiStore'
import { appwriteChatService } from '@/services/chats'
import { useAuthStore } from '@/store/authStore'

export function FriendsView() {
  const subTab = useFriendsStore((s) => s.subTab)
  const setSubTab = useFriendsStore((s) => s.setSubTab)
  const friends = useFriendsStore((s) => s.friends)
  const pendingRequests = useFriendsStore((s) => s.pendingRequests)
  const searchResults = useFriendsStore((s) => s.searchResults)
  const searchQuery = useFriendsStore((s) => s.searchQuery)
  const requestError = useFriendsStore((s) => s.requestError)
  const onlineStatus = useFriendsStore((s) => s.onlineStatus)
  const loadFriends = useFriendsStore((s) => s.loadFriends)
  const searchUsers = useFriendsStore((s) => s.searchUsers)
  const setSearchQuery = useFriendsStore((s) => s.setSearchQuery)
  const sendRequest = useFriendsStore((s) => s.sendRequest)
  const acceptRequest = useFriendsStore((s) => s.acceptRequest)
  const rejectRequest = useFriendsStore((s) => s.rejectRequest)
  const removeFriend = useFriendsStore((s) => s.removeFriend)
  const activeTab = useUiStore((s) => s.activeTab)
  const setTab = useUiStore((s) => s.setTab)
  const setView = useUiStore((s) => s.setView)
  const selectChat = useChatStore((s) => s.selectChat)
  const loadChats = useChatStore((s) => s.loadChats)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchUsers])

  const openDm = async (friend: { userId: string; username: string }) => {
    if (!user) return
    const chat = await appwriteChatService.getOrCreateDm(user.userId, friend.userId, friend.username)
    await loadChats()
    const chats = useChatStore.getState().chats
    if (!chats.some((c) => c.$id === chat.$id)) {
      useChatStore.setState({ chats: [chat, ...chats] })
    }
    selectChat(chat.$id)
    setView('chat')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          Friends
          {pendingRequests.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-label="New friend requests" />
          )}
        </h2>
        <div className="glass-pill flex p-0.5">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`rounded-full px-3 py-1 text-xs ${subTab === 'list' ? 'bg-white/12 text-[#00B4FF]' : 'text-[#A0A4A8]'}`}
          >
            My Friends
          </button>
          <button
            type="button"
            onClick={() => setSubTab('search')}
            className={`rounded-full px-3 py-1 text-xs ${subTab === 'search' ? 'bg-white/12 text-[#00B4FF]' : 'text-[#A0A4A8]'}`}
          >
            Add
          </button>
        </div>
      </div>

      <FriendRequests
        requests={pendingRequests}
        onAccept={(id) => void acceptRequest(id)}
        onReject={(id) => void rejectRequest(id)}
      />

      {subTab === 'search' ? (
        <FriendSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          onSendRequest={(id) => void sendRequest(id)}
          requestError={requestError}
        />
      ) : (
        <FriendList
          friends={friends}
          onlineStatus={onlineStatus}
          onMessage={(friend) => void openDm(friend)}
          onRemove={(friend) => void removeFriend(friend.userId)}
        />
      )}

      <div className="shrink-0 pb-3 pt-1">
        <BottomNavPill
          active={activeTab}
          onChange={setTab}
          badges={{ friends: pendingRequests.length }}
        />
      </div>
    </div>
  )
}
