import { create } from 'zustand'

interface PresenceState {
  onlineUserIds: Set<string>
  lastSeenByUserId: Record<string, string>
  setOnline: (userId: string, online: boolean) => void
  setLastSeen: (userId: string, timestamp: string) => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set<string>(),
  lastSeenByUserId: {},

  setOnline: (userId, online) => {
    const next = new Set(get().onlineUserIds)
    if (online) next.add(userId)
    else next.delete(userId)
    set({ onlineUserIds: next })
  },

  setLastSeen: (userId, timestamp) => {
    set({
      lastSeenByUserId: {
        ...get().lastSeenByUserId,
        [userId]: timestamp,
      },
    })
  },
}))
