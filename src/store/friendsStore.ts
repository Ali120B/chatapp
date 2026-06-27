import { create } from 'zustand'
import type { Friendship, UserProfile, FriendsSubTab } from '@/types'
import { appwriteFriendsService, type UserSearchResult } from '@/services/friends'
import { useAuthStore } from './authStore'

interface FriendsState {
  friends: UserProfile[]
  pendingRequests: Array<Friendship & { fromUser?: UserProfile }>
  searchResults: UserSearchResult[]
  onlineStatus: Record<string, boolean>
  subTab: FriendsSubTab
  isLoading: boolean
  searchQuery: string
  requestError: string | null
  setSubTab: (tab: FriendsSubTab) => void
  setSearchQuery: (q: string) => void
  loadFriends: () => Promise<void>
  searchUsers: (query: string) => Promise<void>
  sendRequest: (toUserId: string) => Promise<void>
  acceptRequest: (friendshipId: string) => Promise<void>
  rejectRequest: (friendshipId: string) => Promise<void>
  removeFriend: (friendUserId: string) => Promise<void>
  blockUser: (toUserId: string) => Promise<void>
  setOnlineStatus: (userId: string, online: boolean) => void
  clearRequestError: () => void
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  searchResults: [],
  onlineStatus: {},
  subTab: 'list',
  isLoading: false,
  searchQuery: '',
  requestError: null,

  setSubTab: (tab) => set({ subTab: tab }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  loadFriends: async () => {
    set({ isLoading: true })
    const user = useAuthStore.getState().user
    if (!user) {
      set({ isLoading: false })
      return
    }

    const [friends, pending] = await Promise.all([
      appwriteFriendsService.getFriends(user.userId),
      appwriteFriendsService.getPendingRequests(user.userId),
    ])
    set({ friends, pendingRequests: pending, isLoading: false })
  },

  searchUsers: async (query) => {
    set({ searchQuery: query, requestError: null })
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    const user = useAuthStore.getState().user
    if (!user) return

    const results = await appwriteFriendsService.searchUsers(query, user.userId)
    if (get().searchQuery !== query) return
    set({ searchResults: results })
  },

  sendRequest: async (toUserId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ requestError: null })
    try {
      await appwriteFriendsService.sendRequest(user.userId, toUserId)
      const results = get().searchResults.map((r) =>
        r.userId === toUserId ? { ...r, friendshipStatus: 'pending_sent' as const } : r,
      )
      set({ searchResults: results })
    } catch (err) {
      set({
        requestError: err instanceof Error ? err.message : 'Could not send request',
      })
    }
  },

  acceptRequest: async (friendshipId) => {
    await appwriteFriendsService.acceptRequest(friendshipId)
    await get().loadFriends()
  },

  rejectRequest: async (friendshipId) => {
    await appwriteFriendsService.rejectRequest(friendshipId)
    await get().loadFriends()
  },

  removeFriend: async (friendUserId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteFriendsService.removeFriend(user.userId, friendUserId)
    await get().loadFriends()
  },

  blockUser: async (toUserId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteFriendsService.blockUser(user.userId, toUserId)
    await get().loadFriends()
  },

  setOnlineStatus: (userId, online) => {
    set({ onlineStatus: { ...get().onlineStatus, [userId]: online } })
  },

  clearRequestError: () => set({ requestError: null }),
}))
