import { create } from 'zustand'
import type { Chat, Message } from '@/types'
import { appwriteChatService } from '@/services/chats'
import { storage, APPWRITE_CONFIG } from '@/services/auth'
import { sanitizeMessage } from '@/utils/profanityFilter'
import { decryptMessage, parseEncryptedPayload } from '@/utils/crypto'
import { useAuthStore } from './authStore'
import { useUiStore } from './uiStore'
import { tempGroupExpiresAt } from '@/utils/tempChat'
import { pollPreview } from '@/utils/polls'
import type { PollCreateInput } from '@/utils/polls'

function messagePreview(message: Message): string {
  if (message.messageType === 'poll' && message.pollData) return pollPreview(message.pollData)
  if (message.imageFileId) return '📷 Photo'
  if (message.isEncrypted) return '🔒 Encrypted message'
  return message.content.slice(0, 80)
}

interface ChatState {
  chats: Chat[]
  activeChatId: string | null
  messagesByChatId: Record<string, Message[]>
  unreadCounts: Record<string, number>
  isLoading: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  loadChats: () => Promise<void>
  selectChat: (chatId: string) => void
  loadMessages: (chatId: string, loadMore?: boolean) => Promise<void>
  sendMessage: (content: string, imageFile?: File, replyToId?: string | null) => Promise<void>
  sendPoll: (poll: PollCreateInput) => Promise<void>
  votePoll: (chatId: string, messageId: string, optionIds: string[]) => Promise<void>
  addPollOptionToMessage: (chatId: string, messageId: string, text: string) => Promise<void>
  addIncomingMessage: (message: Message) => void
  applyMessageUpdate: (message: Message) => void
  applyChatUpdate: (chat: Chat) => void
  removeMessage: (chatId: string, messageId: string) => void
  reactToMessage: (chatId: string, messageId: string, emoji: string) => Promise<void>
  markChatRead: (chatId: string) => void
  createGroup: (name: string, memberIds: string[], type?: Chat['type']) => Promise<Chat>
  addMembersToChat: (chatId: string, memberIds: string[]) => Promise<Chat>
  removeMemberFromChat: (chatId: string, memberId: string) => Promise<Chat>
  leaveChat: (chatId: string) => Promise<void>
  clearChat: (chatId: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  deleteMessage: (chatId: string, messageId: string, forAll: boolean) => Promise<void>
  forwardMessages: (sourceChatId: string, messageIds: string[], targetChatId: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  markMessagesRead: (chatId: string) => Promise<void>
  getTotalUnread: () => number
  decryptContent: (message: Message) => Promise<string>
  purgeExpiredTempChats: () => Promise<void>
}

function saveUnreadToStorage(unreadCounts: Record<string, number>) {
  try { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)) } catch {}
}

function loadUnreadFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem('unreadCounts')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// Track last-seen message per chat to detect new messages during polling

let chatsLoadedOnce = false

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messagesByChatId: {},
  unreadCounts: loadUnreadFromStorage(),
  isLoading: false,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),

  loadChats: async () => {
    set({ isLoading: true })
    const user = useAuthStore.getState().user
    if (!user) {
      set({ isLoading: false })
      return
    }
    await get().purgeExpiredTempChats()
    const fetched = await appwriteChatService.getChats(user.userId)
    const uniqueChats = [...new Map(fetched.map((c) => [c.$id, c])).values()]

    // Read CURRENT state (not stale snapshot from start of async)
    const currentChats = get().chats
    const currentUnread = { ...get().unreadCounts }
    const activeChatId = get().activeChatId

    // For non-active chats, check if last message is new (skip first load)
    if (chatsLoadedOnce) {
      for (const chat of uniqueChats) {
        if (chat.$id === activeChatId) continue
        const local = currentChats.find((c) => c.$id === chat.$id)
        if (!local) continue
        const serverTime = new Date(chat.lastMessageAt ?? chat.createdAt).getTime()
        const localTime = new Date(local.lastMessageAt ?? local.createdAt).getTime()
        if (serverTime > localTime) {
          currentUnread[chat.$id] = (currentUnread[chat.$id] ?? 0) + 1
        }
      }
    }
    chatsLoadedOnce = true

    const mergedChats = uniqueChats.map((chat) => {
      return {
        ...chat,
        lastMessageAt: chat.lastMessageAt ?? chat.createdAt,
        unreadCount: currentUnread[chat.$id] ?? 0,
      }
    }).sort((a, b) => {
      const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
      const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
      return bTime - aTime
    })
    set({ chats: mergedChats, unreadCounts: currentUnread, isLoading: false })
    saveUnreadToStorage(currentUnread)
  },

  selectChat: (chatId) => {
    set({ activeChatId: chatId })
    get().markChatRead(chatId)
    void get().loadMessages(chatId)
    void get().markMessagesRead(chatId)
  },

  loadMessages: async (chatId, loadMore = false) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const existing = get().messagesByChatId[chatId] ?? []
    const cursor = loadMore && existing.length > 0 ? existing[0]?.$id : undefined
    const messages = await appwriteChatService.getMessages(chatId, user.userId, cursor)
    const merged = loadMore ? [...existing, ...messages] : messages
    const deduped = [...new Map(merged.map((m) => [m.$id, m])).values()]

    // Detect new messages from others for unread count
    if (!loadMore && existing.length > 0) {
      const oldIds = new Set(existing.map((m) => m.$id))
      const newFromOthers = deduped.filter((m) => !oldIds.has(m.$id) && m.senderId !== user.userId)
      if (newFromOthers.length > 0) {
        const ui = useUiStore.getState()
        const isViewingChat = ui.isWindowOpen && ui.activeView === 'chat' && get().activeChatId === chatId
        if (!isViewingChat) {
          const next = (get().unreadCounts[chatId] ?? 0) + newFromOthers.length
          const newUnread = { ...get().unreadCounts, [chatId]: next }
          set({
            unreadCounts: newUnread,
            chats: get().chats.map((c) =>
              c.$id === chatId ? { ...c, unreadCount: next } : c,
            ),
          })
          saveUnreadToStorage(newUnread)
        }
      }
    }

    set({
      messagesByChatId: {
        ...get().messagesByChatId,
        [chatId]: deduped.sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        ),
      },
    })
  },

  sendMessage: async (content, imageFile, replyToId = null) => {
    const { activeChatId } = get()
    const user = useAuthStore.getState().user
    if (!activeChatId || !user) return

    const { sanitized, filteredCount } = sanitizeMessage(content)
    if (!sanitized && !imageFile) return

    let imageFileId: string | null = null
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB')
      const uploaded = await storage.createFile(
        APPWRITE_CONFIG.storageBucket,
        crypto.randomUUID(),
        imageFile,
      )
      imageFileId = uploaded.$id
    }

    const message = await appwriteChatService.sendMessage(
      activeChatId,
      user.userId,
      sanitized || (imageFile ? '📷 Photo' : ''),
      filteredCount,
      false,
      imageFileId,
      replyToId,
    )

    const current = get().messagesByChatId[activeChatId] ?? []
    if (current.some((m) => m.$id === message.$id)) return

    const preview = messagePreview(message)
    const chat = get().chats.find((c) => c.$id === activeChatId)
    set({
      messagesByChatId: {
        ...get().messagesByChatId,
        [activeChatId]: [...current, message],
      },
      chats: get().chats.map((c) => {
        if (c.$id !== activeChatId) return c
        return {
          ...c,
          lastMessage: preview,
          lastMessageAt: message.sentAt,
          ...(chat?.type === 'group_temp' ? { expiresAt: tempGroupExpiresAt() } : {}),
        }
      }).sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
        return bTime - aTime
      }),
    })
  },

  sendPoll: async (pollInput) => {
    const { activeChatId } = get()
    const user = useAuthStore.getState().user
    if (!activeChatId || !user) return

    const message = await appwriteChatService.sendPoll(activeChatId, user.userId, pollInput)
    const current = get().messagesByChatId[activeChatId] ?? []
    if (current.some((m) => m.$id === message.$id)) return

    const preview = messagePreview(message)
    const chat = get().chats.find((c) => c.$id === activeChatId)
    set({
      messagesByChatId: {
        ...get().messagesByChatId,
        [activeChatId]: [...current, message],
      },
      chats: get().chats.map((c) => {
        if (c.$id !== activeChatId) return c
        return {
          ...c,
          lastMessage: preview,
          lastMessageAt: message.sentAt,
          ...(chat?.type === 'group_temp' ? { expiresAt: tempGroupExpiresAt() } : {}),
        }
      }).sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
        return bTime - aTime
      }),
    })
  },

  votePoll: async (chatId, messageId, optionIds) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const updated = await appwriteChatService.voteOnPoll(messageId, user.userId, optionIds)
    get().applyMessageUpdate(updated)
    void chatId
  },

  addPollOptionToMessage: async (chatId, messageId, text) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const updated = await appwriteChatService.addPollOption(messageId, user.userId, text)
    get().applyMessageUpdate(updated)
    void chatId
  },

  applyChatUpdate: (incoming) => {
    const chats = get().chats
    const existing = chats.find((c) => c.$id === incoming.$id)
    if (!existing) {
      set({ chats: [{ ...incoming, lastMessageAt: incoming.lastMessageAt ?? incoming.createdAt }, ...chats].sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
        return bTime - aTime
      }) })
      return
    }
    set({
      chats: chats.map((c) =>
        c.$id === incoming.$id
          ? {
              ...c,
              ...incoming,
              lastMessage: c.lastMessage,
              lastMessageAt: incoming.lastMessageAt ?? c.lastMessageAt ?? c.createdAt,
              unreadCount: c.unreadCount ?? get().unreadCounts[c.$id] ?? 0,
            }
          : c,
      ).sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
        return bTime - aTime
      }),
    })
  },

  applyMessageUpdate: (message) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { messagesByChatId } = get()
    const existing = messagesByChatId[message.chatId] ?? []
    const hidden = message.deletedForUserIds?.includes(user.userId)

    if (hidden) {
      get().removeMessage(message.chatId, message.$id)
      return
    }

    const idx = existing.findIndex((m) => m.$id === message.$id)
    const next =
      idx >= 0
        ? existing.map((m) => (m.$id === message.$id ? message : m))
        : [...existing, message]

    set({
      messagesByChatId: {
        ...messagesByChatId,
        [message.chatId]: next.sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        ),
      },
    })
  },

  removeMessage: (chatId, messageId) => {
    const messages = get().messagesByChatId[chatId] ?? []
    const next = messages.filter((m) => m.$id !== messageId)
    const last = next[next.length - 1]
    set({
      messagesByChatId: { ...get().messagesByChatId, [chatId]: next },
      chats: get().chats.map((c) =>
        c.$id === chatId ? { ...c, lastMessage: last ? messagePreview(last) : undefined } : c,
      ),
    })
  },

  reactToMessage: async (chatId, messageId, emoji) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const updated = await appwriteChatService.toggleReaction(messageId, user.userId, emoji)
    get().applyMessageUpdate(updated)
    void chatId
  },

  addIncomingMessage: (message) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { activeChatId, messagesByChatId, unreadCounts, chats } = get()
    const existing = messagesByChatId[message.chatId] ?? []
    if (existing.some((m) => m.$id === message.$id)) return

    const ui = useUiStore.getState()
    const isSelf = message.senderId === user.userId
    const isViewingChat =
      ui.isWindowOpen && ui.activeView === 'chat' && activeChatId === message.chatId

    const preview = messagePreview(message)
    const chat = chats.find((c) => c.$id === message.chatId)
    if (chat?.type === 'group_temp') {
      void appwriteChatService.touchTempGroupExpiry(message.chatId)
    }

    set({
      messagesByChatId: {
        ...messagesByChatId,
        [message.chatId]: [...existing, message],
      },
      chats: chats.map((c) => {
        if (c.$id !== message.chatId) return c
        return {
          ...c,
          lastMessage: preview,
          lastMessageAt: message.sentAt,
          ...(c.type === 'group_temp' ? { expiresAt: tempGroupExpiresAt() } : {}),
        }
      }).sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime()
        return bTime - aTime
      }),
    })

    if (isSelf) return
    if (isViewingChat) {
      get().markChatRead(message.chatId)
      void get().markMessagesRead(message.chatId)
    } else {
      const next = (unreadCounts[message.chatId] ?? 0) + 1
      const newUnread = { ...get().unreadCounts, [message.chatId]: next }
      set({
        unreadCounts: newUnread,
        chats: get().chats.map((c) =>
          c.$id === message.chatId ? { ...c, unreadCount: next } : c,
        ),
      })
      saveUnreadToStorage(newUnread)
    }
  },

  markChatRead: (chatId) => {
    const newUnread = { ...get().unreadCounts, [chatId]: 0 }
    set({
      unreadCounts: newUnread,
      chats: get().chats.map((c) =>
        c.$id === chatId ? { ...c, unreadCount: 0 } : c,
      ),
    })
    saveUnreadToStorage(newUnread)
  },

  createGroup: async (name, memberIds, type = 'group_temp') => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Not authenticated')
    const chat = await appwriteChatService.createGroup(name, memberIds, user.userId, type)
    set({ chats: [chat, ...get().chats.filter((c) => c.$id !== chat.$id)] })
    return chat
  },

  addMembersToChat: async (chatId, memberIds) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Not authenticated')
    const chat = await appwriteChatService.addMembers(chatId, memberIds, user.userId)
    set({
      chats: get().chats.map((c) => (c.$id === chatId ? { ...c, ...chat, lastMessage: c.lastMessage } : c)),
    })
    return chat
  },

  removeMemberFromChat: async (chatId, memberId) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Not authenticated')
    const chat = await appwriteChatService.removeMember(chatId, memberId, user.userId)
    set({
      chats: get().chats.map((c) => (c.$id === chatId ? { ...c, ...chat, lastMessage: c.lastMessage } : c)),
    })
    return chat
  },

  leaveChat: async (chatId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteChatService.leaveChat(chatId, user.userId)
    const { [chatId]: _, ...restMessages } = get().messagesByChatId
    const { [chatId]: __, ...restUnread } = get().unreadCounts
    set({
      chats: get().chats.filter((c) => c.$id !== chatId),
      messagesByChatId: restMessages,
      unreadCounts: restUnread,
      activeChatId: get().activeChatId === chatId ? null : get().activeChatId,
    })
  },

  clearChat: async (chatId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteChatService.clearChat(chatId, user.userId)
    set({
      messagesByChatId: { ...get().messagesByChatId, [chatId]: [] },
      unreadCounts: { ...get().unreadCounts, [chatId]: 0 },
      chats: get().chats.map((c) =>
        c.$id === chatId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c,
      ),
    })
  },

  deleteChat: async (chatId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteChatService.deleteChat(chatId, user.userId)
    const { [chatId]: _, ...restMessages } = get().messagesByChatId
    const { [chatId]: __, ...restUnread } = get().unreadCounts
    set({
      chats: get().chats.filter((c) => c.$id !== chatId),
      messagesByChatId: restMessages,
      unreadCounts: restUnread,
      activeChatId: get().activeChatId === chatId ? null : get().activeChatId,
    })
  },

  deleteMessage: async (chatId, messageId, forAll) => {
    const user = useAuthStore.getState().user
    if (!user) return
    await appwriteChatService.deleteMessage(chatId, messageId, user.userId, forAll)
    get().removeMessage(chatId, messageId)
  },

  forwardMessages: async (sourceChatId, messageIds, targetChatId) => {
    const user = useAuthStore.getState().user
    if (!user || messageIds.length === 0) return

    const sourceMessages = get().messagesByChatId[sourceChatId] ?? []
    const selected = sourceMessages
      .filter((message) => messageIds.includes(message.$id))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

    if (selected.length === 0) return

    const forwarded: Message[] = []
    for (const message of selected) {
      const content = message.isEncrypted ? await get().decryptContent(message) : message.content
      const nextMessage = await appwriteChatService.sendMessage(
        targetChatId,
        user.userId,
        content,
        message.filteredWordCount,
        false,
        message.imageFileId,
      )
      forwarded.push(nextMessage)
    }

    if (forwarded.length === 0) return

    const targetMessages = get().messagesByChatId[targetChatId] ?? []
    const lastForwarded = forwarded[forwarded.length - 1]

    set({
      messagesByChatId: {
        ...get().messagesByChatId,
        [targetChatId]: [...targetMessages, ...forwarded].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        ),
      },
      chats: get().chats.map((chat) =>
        chat.$id === targetChatId
          ? {
              ...chat,
              lastMessage: lastForwarded.isEncrypted ? '🔒 Encrypted message' : lastForwarded.content,
            }
          : chat,
      ),
    })
  },

  editMessage: async (messageId, newContent) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const updated = await appwriteChatService.editMessage(messageId, user.userId, newContent)
    get().applyMessageUpdate(updated)
  },

  markMessagesRead: async (chatId) => {
    const user = useAuthStore.getState().user
    if (!user) return
    void appwriteChatService.markMessagesRead(chatId, user.userId)
  },

  getTotalUnread: () => {
    return Object.values(get().unreadCounts).reduce((a, b) => a + b, 0)
  },

  decryptContent: async (message) => {
    if (!message.isEncrypted) return message.content
    const payload = parseEncryptedPayload(message.content)
    if (!payload) return message.content
    try {
      return await decryptMessage(payload, '')
    } catch {
      return '🔒 Unable to decrypt'
    }
  },

  purgeExpiredTempChats: async () => {
    const removed = await appwriteChatService.purgeExpiredTempGroups()
    if (removed.length === 0) return

    const { activeChatId, messagesByChatId, unreadCounts } = get()
    const nextMessages = { ...messagesByChatId }
    const nextUnread = { ...unreadCounts }
    for (const id of removed) {
      delete nextMessages[id]
      delete nextUnread[id]
    }

    set({
      chats: get().chats.filter((c) => !removed.includes(c.$id)),
      messagesByChatId: nextMessages,
      unreadCounts: nextUnread,
      activeChatId: activeChatId && removed.includes(activeChatId) ? null : activeChatId,
    })

    if (activeChatId && removed.includes(activeChatId)) {
      useUiStore.getState().setView('home')
    }
  },
}))
