import {
  databases,
  APPWRITE_CONFIG,
  ID,
  Query,
} from './appwrite'
import type { Chat, Message } from '@/types'
import { isTempGroupExpired, tempGroupExpiresAt } from '@/utils/tempChat'
import { sanitizeMessage } from '@/utils/profanityFilter'
import { parseReactions, serializeReactions, toggleReaction } from '@/utils/reactions'
import {
  addPollOption as appendPollOption,
  applyVote,
  createPollData,
  parsePoll,
  pollPreview,
  serializePoll,
  type PollCreateInput,
} from '@/utils/polls'

function messagePreview(doc: Record<string, unknown>, userId: string): string | null {
  const deleted = (doc.deletedForUserIds as string[] | undefined) ?? []
  if (deleted.includes(userId)) return null
  if (doc.messageType === 'poll') {
    const poll = parsePoll(doc.pollData as string | undefined)
    return poll ? pollPreview(poll) : '📊 Poll'
  }
  if (doc.imageFileId) return '📷 Photo'
  const content = doc.content as string
  if (doc.isEncrypted) return '🔒 Encrypted message'
  return content.slice(0, 80)
}

export const appwriteChatService = {
  async getChats(userId: string): Promise<Chat[]> {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      [Query.contains('memberIds', userId), Query.isNull('deletedAt')],
    )
    const chats = res.documents
      .map(docToChat)
      .filter((c) => !(c.hiddenForUserIds ?? []).includes(userId))
      .filter((c) => !isTempGroupExpired(c.expiresAt))

    const withPreview = await Promise.all(
      chats.map(async (chat) => {
        const preview = await getLastMessagePreview(chat.$id, userId)
        return preview ? { ...chat, lastMessage: preview } : chat
      }),
    )
    return withPreview
  },

  async getMessages(chatId: string, userId: string, cursor?: string): Promise<Message[]> {
    const queries = [
      Query.equal('chatId', chatId),
      Query.orderDesc('sentAt'),
      Query.limit(50),
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      queries,
    )
    return res.documents
      .map(docToMessage)
      .filter((m) => !m.deletedForUserIds?.includes(userId))
  },

  async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    filteredWordCount: number,
    isEncrypted: boolean,
    imageFileId: string | null = null,
    replyToId: string | null = null,
  ): Promise<Message> {
    const doc = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      ID.unique(),
      {
        messageId: ID.unique(),
        chatId,
        senderId,
        content,
        imageFileId,
        isEncrypted,
        filteredWordCount,
        sentAt: new Date().toISOString(),
        replyToId,
        messageType: imageFileId ? 'image' : 'text',
      },
    )
    await bumpTempGroupExpiry(chatId)
    return docToMessage(doc)
  },

  async sendPoll(chatId: string, senderId: string, input: PollCreateInput): Promise<Message> {
    const poll = createPollData(input)
    const doc = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      ID.unique(),
      {
        messageId: ID.unique(),
        chatId,
        senderId,
        content: pollPreview(poll),
        imageFileId: null,
        isEncrypted: false,
        filteredWordCount: 0,
        sentAt: new Date().toISOString(),
        replyToId: null,
        messageType: 'poll',
        pollData: serializePoll(poll),
      },
    )
    await bumpTempGroupExpiry(chatId)
    return docToMessage(doc)
  },

  async voteOnPoll(messageId: string, userId: string, optionIds: string[]): Promise<Message> {
    const msg = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
    )
    const poll = parsePoll(msg.pollData as string | undefined)
    if (!poll) throw new Error('Poll not found')
    const next = applyVote(poll, userId, optionIds)
    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
      { pollData: serializePoll(next) },
    )
    return docToMessage(updated)
  },

  async addPollOption(messageId: string, userId: string, text: string): Promise<Message> {
    const msg = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
    )
    const poll = parsePoll(msg.pollData as string | undefined)
    if (!poll) throw new Error('Poll not found')
    void userId
    const next = appendPollOption(poll, text)
    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
      { pollData: serializePoll(next) },
    )
    return docToMessage(updated)
  },

  async createGroup(
    name: string,
    memberIds: string[],
    creatorId: string,
    type: Chat['type'] = 'group_temp',
  ): Promise<Chat> {
    const uniqueMemberIds = [...new Set([creatorId, ...memberIds])]
    const doc = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      ID.unique(),
      {
        chatId: ID.unique(),
        type,
        name,
        memberIds: uniqueMemberIds,
        activeMemberIds: uniqueMemberIds,
        adminIds: [creatorId],
        encryptionKeyHint: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        expiresAt: type === 'group_temp' ? tempGroupExpiresAt() : null,
      },
    )
    return docToChat(doc)
  },

  async addMembers(chatId: string, memberIds: string[], actorId: string): Promise<Chat> {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    if (chat.type !== 'group_temp' && chat.type !== 'group_persist') {
      throw new Error('Only groups support members')
    }

    const adminIds = (chat.adminIds as string[] | undefined) ?? [(chat.memberIds as string[])[0]]
    if (!adminIds.includes(actorId)) {
      throw new Error('Only group admins can add members')
    }

    const currentMemberIds = chat.memberIds as string[]
    const currentActiveIds = (chat.activeMemberIds as string[] | undefined) ?? currentMemberIds
    const nextMemberIds = [...new Set([...currentMemberIds, ...memberIds])]
    const nextActiveIds = [...new Set([...currentActiveIds, ...memberIds])]

    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
      {
        memberIds: nextMemberIds,
        activeMemberIds: nextActiveIds,
      },
    )
    return docToChat(updated)
  },

  async removeMember(chatId: string, memberId: string, actorId: string): Promise<Chat> {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    if (chat.type !== 'group_temp' && chat.type !== 'group_persist') {
      throw new Error('Only groups support members')
    }

    const currentMemberIds = chat.memberIds as string[]
    const adminIds = (chat.adminIds as string[] | undefined) ?? currentMemberIds.slice(0, 1)
    if (!adminIds.includes(actorId)) {
      throw new Error('Only group admins can remove members')
    }
    if (memberId === actorId) {
      throw new Error('Use leave group to remove yourself')
    }

    const nextMemberIds = currentMemberIds.filter((id) => id !== memberId)
    const nextActiveIds = ((chat.activeMemberIds as string[] | undefined) ?? currentMemberIds).filter(
      (id) => id !== memberId,
    )
    const nextAdminIds = adminIds.filter((id) => id !== memberId)

    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
      {
        memberIds: nextMemberIds,
        activeMemberIds: nextActiveIds,
        adminIds: nextAdminIds,
      },
    )
    return docToChat(updated)
  },

  async joinChat(chatId: string, userId: string): Promise<void> {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    const active = chat.activeMemberIds as string[]
    if (!active.includes(userId)) {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.chats,
        chatId,
        { activeMemberIds: [...active, userId] },
      )
    }
  },

  async leaveChat(chatId: string, userId: string): Promise<void> {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    const memberIds = (chat.memberIds as string[]).filter((id) => id !== userId)
    const active = ((chat.activeMemberIds as string[] | undefined) ?? (chat.memberIds as string[])).filter(
      (id) => id !== userId,
    )
    const adminIds = ((chat.adminIds as string[] | undefined) ?? []).filter((id) => id !== userId)
    const nextAdminIds = adminIds.length > 0 ? adminIds : memberIds.slice(0, 1)

    if (chat.type === 'group_temp' && memberIds.length === 0) {
      await cleanupChat(chatId)
    } else {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.chats,
        chatId,
        {
          memberIds,
          activeMemberIds: active,
          adminIds: nextAdminIds,
        },
      )
    }
  },

  async getOrCreateDm(
    userId: string,
    otherUserId: string,
    otherUsername: string,
  ): Promise<Chat> {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      [
        Query.equal('type', 'dm'),
        Query.contains('memberIds', userId),
        Query.contains('memberIds', otherUserId),
      ],
    )
    if (res.documents.length > 0) {
      const existing = res.documents[0]
      const hidden = (existing.hiddenForUserIds as string[] | undefined) ?? []
      const updates: Record<string, unknown> = {}
      if (hidden.includes(userId)) {
        updates.hiddenForUserIds = hidden.filter((id) => id !== userId)
      }
      if (existing.deletedAt) {
        updates.deletedAt = null
      }
      if (Object.keys(updates).length > 0) {
        const updated = await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.chats,
          existing.$id as string,
          updates,
        )
        return docToChat(updated)
      }
      return docToChat(existing)
    }

    const doc = await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      ID.unique(),
      {
        chatId: ID.unique(),
        type: 'dm',
        name: otherUsername,
        memberIds: [userId, otherUserId],
        activeMemberIds: [],
        encryptionKeyHint: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      },
    )
    return docToChat(doc)
  },

  async setEncryptionHint(chatId: string, hint: string): Promise<void> {
    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
      { encryptionKeyHint: hint },
    )
  },

  async clearChat(chatId: string, userId: string): Promise<void> {
    const messages = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      [Query.equal('chatId', chatId), Query.limit(100)],
    )
    for (const msg of messages.documents) {
      const deleted = (msg.deletedForUserIds as string[] | undefined) ?? []
      if (deleted.includes(userId)) continue
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.messages,
        msg.$id,
        { deletedForUserIds: [...deleted, userId] },
      )
    }
  },

  async deleteChat(chatId: string, userId: string): Promise<void> {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    const memberIds = chat.memberIds as string[]
    if (!memberIds.includes(userId)) return

    const hidden = (chat.hiddenForUserIds as string[] | undefined) ?? []
    if (!hidden.includes(userId)) {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.chats,
        chatId,
        { hiddenForUserIds: [...hidden, userId] },
      )
    }
  },

  async deleteMessage(
    chatId: string,
    messageId: string,
    userId: string,
    forAll: boolean,
  ): Promise<void> {
    const msg = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
    )
    if (msg.chatId !== chatId) return

    if (forAll) {
      if (msg.senderId !== userId) {
        throw new Error('You can only delete your own messages for everyone')
      }
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.messages,
        messageId,
      )
    } else {
      const deleted = (msg.deletedForUserIds as string[] | undefined) ?? []
      if (!deleted.includes(userId)) {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.messages,
          messageId,
          { deletedForUserIds: [...deleted, userId] },
        )
      }
    }
  },

  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<Message> {
    const msg = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
    )
    const current = parseReactions(msg.reactions as string | undefined)
    const next = toggleReaction(current, emoji, userId)
    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
      { reactions: serializeReactions(next) },
    )
    return docToMessage(updated)
  },

  async markMessagesRead(chatId: string, userId: string): Promise<void> {
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.messages,
        [Query.equal('chatId', chatId), Query.limit(100)],
      )
      for (const doc of res.documents) {
        const readBy = (doc.readBy as string[] | undefined) ?? []
        if (readBy.includes(userId)) continue
        if (doc.senderId === userId) continue
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.messages,
          doc.$id,
          { readBy: [...readBy, userId] },
        )
      }
    } catch {
      // degrade gracefully
    }
  },

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<Message> {
    const msg = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
    )
    if (msg.senderId !== userId) {
      throw new Error('You can only edit your own messages')
    }
    const { sanitized, filteredCount } = sanitizeMessage(newContent)
    const updated = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      messageId,
      {
        content: sanitized,
        filteredWordCount: filteredCount,
        editedAt: new Date().toISOString(),
      },
    )
    return docToMessage(updated)
  },

  async touchTempGroupExpiry(chatId: string): Promise<void> {
    await bumpTempGroupExpiry(chatId)
  },

  async purgeExpiredTempGroups(): Promise<string[]> {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      [Query.equal('type', 'group_temp'), Query.isNull('deletedAt'), Query.limit(100)],
    )

    const removed: string[] = []
    for (const doc of res.documents) {
      const expiresAt = doc.expiresAt as string | null | undefined
      if (!isTempGroupExpired(expiresAt)) continue
      await cleanupChat(doc.$id as string)
      removed.push(doc.$id as string)
    }
    return removed
  },
}

async function getLastMessagePreview(chatId: string, userId: string): Promise<string | undefined> {
  const res = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.messages,
    [Query.equal('chatId', chatId), Query.orderDesc('sentAt'), Query.limit(25)],
  )
  for (const doc of res.documents) {
    const preview = messagePreview(doc, userId)
    if (preview) return preview
  }
  return undefined
}

async function bumpTempGroupExpiry(chatId: string): Promise<void> {
  try {
    const chat = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
    )
    if (chat.type !== 'group_temp') return
    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.chats,
      chatId,
      { expiresAt: tempGroupExpiresAt() },
    )
  } catch {
    // chat may already be deleted
  }
}

async function cleanupChat(chatId: string): Promise<void> {
  const messages = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.messages,
    [Query.equal('chatId', chatId), Query.limit(100)],
  )
  for (const msg of messages.documents) {
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.messages,
      msg.$id,
    )
  }
  await databases.deleteDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.chats,
    chatId,
  )
}

function docToChat(doc: Record<string, unknown>): Chat {
  return {
    $id: doc.$id as string,
    chatId: doc.chatId as string,
    type: doc.type as Chat['type'],
    name: doc.name as string | null,
    memberIds: doc.memberIds as string[],
    activeMemberIds: doc.activeMemberIds as string[],
    encryptionKeyHint: doc.encryptionKeyHint as string | null,
    createdAt: doc.createdAt as string,
    deletedAt: doc.deletedAt as string | null,
    adminIds: (doc.adminIds as string[] | undefined) ?? undefined,
    expiresAt: (doc.expiresAt as string | null | undefined) ?? null,
    hiddenForUserIds: (doc.hiddenForUserIds as string[] | undefined) ?? [],
  }
}

function docToMessage(doc: Record<string, unknown>): Message & { deletedForUserIds?: string[] } {
  const messageType = (doc.messageType as Message['messageType'] | undefined) ?? 'text'
  return {
    $id: doc.$id as string,
    messageId: doc.messageId as string,
    chatId: doc.chatId as string,
    senderId: doc.senderId as string,
    content: doc.content as string,
    imageFileId: doc.imageFileId as string | null,
    isEncrypted: doc.isEncrypted as boolean,
    filteredWordCount: doc.filteredWordCount as number,
    sentAt: doc.sentAt as string,
    replyToId: (doc.replyToId as string | null | undefined) ?? null,
    deletedForUserIds: (doc.deletedForUserIds as string[] | undefined) ?? [],
  reactions: parseReactions(doc.reactions as string | undefined),
  messageType,
  pollData: messageType === 'poll' ? parsePoll(doc.pollData as string | undefined) : null,
  editedAt: (doc.editedAt as string | null | undefined) ?? null,
  readBy: (doc.readBy as string[] | undefined) ?? [],
}
}
