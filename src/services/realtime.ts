import { client, APPWRITE_CONFIG } from './appwrite'
import type { Message, Chat } from '@/types'
import { parseReactions } from '@/utils/reactions'
import { parsePoll } from '@/utils/polls'

type MessageHandler = (message: Message) => void
type MessageDeleteHandler = (chatId: string, messageId: string) => void
type ChatHandler = (chat: Chat) => void

let unsubscribe: (() => void) | null = null

export function subscribeToRealtime(
  userId: string,
  isKnownChat: (chatId: string) => boolean,
  onMessageCreate: MessageHandler,
  onMessageUpdate: MessageHandler,
  onMessageDelete: MessageDeleteHandler,
  onChatUpdate: ChatHandler,
): () => void {
  if (unsubscribe) unsubscribe()

  const dbId = APPWRITE_CONFIG.databaseId
  const msgCol = APPWRITE_CONFIG.collections.messages
  const chatCol = APPWRITE_CONFIG.collections.chats

  unsubscribe = client.subscribe(
    [
      `databases.${dbId}.collections.${msgCol}.documents`,
      `databases.${dbId}.collections.${chatCol}.documents`,
    ],
    (response) => {
      const payload = response.payload as Record<string, unknown>
      const events = response.events

      if (events.some((e) => e.includes(msgCol))) {
        const chatId = payload.chatId as string
        const messageId = payload.$id as string
        if (!chatId || !messageId) return

        const isDelete = events.some((e) => e.includes('.delete'))
        const isUpdate = events.some((e) => e.includes('.update'))

        if (isDelete) {
          if (isKnownChat(chatId)) onMessageDelete(chatId, messageId)
          return
        }

        const msg = payloadToMessage(payload)
        if (isUpdate) {
          if (isKnownChat(chatId)) onMessageUpdate(msg)
          return
        }

        if (msg.senderId !== userId) {
          onMessageCreate(msg)
        }
      }

      if (events.some((e) => e.includes(chatCol))) {
        const chat = payloadToChat(payload)
        if (chat.memberIds.includes(userId)) {
          onChatUpdate(chat)
        }
      }
    },
  )

  return () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }
}

function payloadToMessage(doc: Record<string, unknown>): Message {
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
    messageType: (doc.messageType as Message['messageType'] | undefined) ?? 'text',
    pollData:
      (doc.messageType as string | undefined) === 'poll'
        ? parsePoll(doc.pollData as string | undefined)
        : null,
  }
}

function payloadToChat(doc: Record<string, unknown>): Chat {
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
    hiddenForUserIds: (doc.hiddenForUserIds as string[] | undefined) ?? [],
    adminIds: (doc.adminIds as string[] | undefined) ?? undefined,
    expiresAt: (doc.expiresAt as string | null | undefined) ?? null,
  }
}

export function subscribeMockRealtime(
  onMessage: MessageHandler,
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<Message>).detail
    onMessage(detail)
  }
  window.addEventListener('mock-message', handler)
  return () => window.removeEventListener('mock-message', handler)
}

export function emitMockMessage(message: Message): void {
  window.dispatchEvent(new CustomEvent('mock-message', { detail: message }))
}
