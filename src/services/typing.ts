import { databases, APPWRITE_CONFIG, ID, Query } from './appwrite'

const TTL_MS = 5000
const pending = new Map<string, ReturnType<typeof setTimeout>>()

export const typingService = {
  async setTyping(chatId: string, userId: string, username: string): Promise<void> {
    try {
      const key = `${chatId}:${userId}`
      const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

      // Debounce rapid keystrokes — only fire if no pending update for this key
      if (pending.has(key)) {
        clearTimeout(pending.get(key)!)
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(async () => {
          pending.delete(key)
          try {
            const existing = await databases.listDocuments(
              APPWRITE_CONFIG.databaseId,
              'typing',
              [
                Query.equal('chatId', chatId),
                Query.equal('userId', userId),
                Query.limit(1),
              ],
            )

            if (existing.documents.length > 0) {
              await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                'typing',
                existing.documents[0].$id,
                { expiresAt },
              )
            } else {
              await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                'typing',
                ID.unique(),
                { chatId, userId, username, expiresAt },
              )
            }
          } catch {
            // typing collection may not exist yet
          }
          resolve()
        }, 300)
        pending.set(key, timer)
      })
    } catch {
      // degrade gracefully
    }
  },

  async clearTyping(chatId: string, userId: string): Promise<void> {
    try {
      const key = `${chatId}:${userId}`
      if (pending.has(key)) {
        clearTimeout(pending.get(key)!)
        pending.delete(key)
      }

      const existing = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        'typing',
        [
          Query.equal('chatId', chatId),
          Query.equal('userId', userId),
          Query.limit(1),
        ],
      )
      if (existing.documents.length > 0) {
        await databases.deleteDocument(
          APPWRITE_CONFIG.databaseId,
          'typing',
          existing.documents[0].$id,
        )
      }
    } catch {
      // degrade gracefully
    }
  },
}
