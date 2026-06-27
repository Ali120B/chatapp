import type { Chat, Message } from '@/types'
import {
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_USER,
} from './data'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockChatService = {
  async getChats(): Promise<Chat[]> {
    await delay(200)
    return [...MOCK_CHATS]
  },

  async getMessages(chatId: string, cursor?: string): Promise<Message[]> {
    await delay(200)
    const all = MOCK_MESSAGES[chatId] ?? []
    const sorted = [...all].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    )
    if (!cursor) return sorted.slice(0, 50)
    const idx = sorted.findIndex((m) => m.$id === cursor)
    return sorted.slice(idx + 1, idx + 51)
  },

  async sendMessage(
    chatId: string,
    content: string,
    filteredWordCount: number,
    isEncrypted: boolean,
    imageFileId: string | null = null,
    replyToId: string | null = null,
  ): Promise<Message> {
    await delay(150)
    const msg: Message = {
      $id: `msg-${Date.now()}`,
      messageId: `msg-${Date.now()}`,
      chatId,
      senderId: MOCK_USER.userId,
      content,
      imageFileId,
      isEncrypted,
      filteredWordCount,
      sentAt: new Date().toISOString(),
      replyToId,
    }
    if (!MOCK_MESSAGES[chatId]) MOCK_MESSAGES[chatId] = []
    MOCK_MESSAGES[chatId].push(msg)

    const chat = MOCK_CHATS.find((c) => c.$id === chatId)
    if (chat) {
      chat.lastMessage = isEncrypted ? '🔒 Encrypted message' : content
    }
    return msg
  },

  async createTempGroup(name: string, memberIds: string[]): Promise<Chat> {
    await delay(300)
    const chat: Chat = {
      $id: `chat-${Date.now()}`,
      chatId: `chat-${Date.now()}`,
      type: 'group_temp',
      name,
      memberIds: [MOCK_USER.userId, ...memberIds],
      activeMemberIds: [MOCK_USER.userId],
      encryptionKeyHint: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      lastMessage: undefined,
      unreadCount: 0,
    }
    MOCK_CHATS.unshift(chat)
    MOCK_MESSAGES[chat.$id] = []
    return chat
  },

  async leaveChat(chatId: string): Promise<void> {
    await delay(200)
    const chat = MOCK_CHATS.find((c) => c.$id === chatId)
    if (!chat) return
    chat.activeMemberIds = chat.activeMemberIds.filter((id) => id !== MOCK_USER.userId)
    if (chat.type === 'group_temp' && chat.activeMemberIds.length === 0) {
      const idx = MOCK_CHATS.findIndex((c) => c.$id === chatId)
      if (idx >= 0) MOCK_CHATS.splice(idx, 1)
      delete MOCK_MESSAGES[chatId]
    }
  },

  async clearChat(chatId: string): Promise<void> {
    await delay(150)
    MOCK_MESSAGES[chatId] = []
    const chat = MOCK_CHATS.find((c) => c.$id === chatId)
    if (chat) {
      chat.lastMessage = undefined
      chat.unreadCount = 0
    }
  },

  async deleteChat(chatId: string): Promise<void> {
    await delay(150)
    const idx = MOCK_CHATS.findIndex((c) => c.$id === chatId)
    if (idx >= 0) MOCK_CHATS.splice(idx, 1)
    delete MOCK_MESSAGES[chatId]
  },

  async deleteMessage(chatId: string, messageId: string, _forAll: boolean): Promise<void> {
    await delay(100)
    const msgs = MOCK_MESSAGES[chatId]
    if (!msgs) return
    const idx = msgs.findIndex((m) => m.$id === messageId)
    if (idx >= 0) msgs.splice(idx, 1)
  },

  async getOrCreateDm(otherUserId: string, otherUsername: string): Promise<Chat> {
    await delay(200)
    const existing = MOCK_CHATS.find(
      (c) =>
        c.type === 'dm' &&
        c.memberIds.includes(MOCK_USER.userId) &&
        c.memberIds.includes(otherUserId),
    )
    if (existing) return existing

    const chat: Chat = {
      $id: `chat-dm-${Date.now()}`,
      chatId: `chat-dm-${Date.now()}`,
      type: 'dm',
      name: otherUsername,
      memberIds: [MOCK_USER.userId, otherUserId],
      activeMemberIds: [],
      encryptionKeyHint: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      unreadCount: 0,
    }
    MOCK_CHATS.unshift(chat)
    MOCK_MESSAGES[chat.$id] = []
    return chat
  },
}
