import { create } from 'zustand'

interface TypingUser {
  userId: string
  username: string
}

interface TypingState {
  typingUsersByChatId: Record<string, TypingUser[]>
  setTypingUsers: (chatId: string, users: TypingUser[]) => void
  addTypingUser: (chatId: string, user: TypingUser) => void
  removeTypingUser: (chatId: string, userId: string) => void
}

export const useTypingStore = create<TypingState>((set, get) => ({
  typingUsersByChatId: {},

  setTypingUsers: (chatId, users) => {
    set({
      typingUsersByChatId: {
        ...get().typingUsersByChatId,
        [chatId]: users,
      },
    })
  },

  addTypingUser: (chatId, user) => {
    const current = get().typingUsersByChatId[chatId] ?? []
    if (current.some((u) => u.userId === user.userId)) return
    set({
      typingUsersByChatId: {
        ...get().typingUsersByChatId,
        [chatId]: [...current, user],
      },
    })
  },

  removeTypingUser: (chatId, userId) => {
    const current = get().typingUsersByChatId[chatId] ?? []
    const next = current.filter((u) => u.userId !== userId)
    set({
      typingUsersByChatId: {
        ...get().typingUsersByChatId,
        [chatId]: next,
      },
    })
  },
}))
