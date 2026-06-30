import { databases, APPWRITE_CONFIG } from './appwrite'

let heartbeatInterval: ReturnType<typeof setInterval> | null = null
let currentUserId: string | null = null

export const presenceService = {
  async startPresenceHeartbeat(userId: string): Promise<void> {
    // Guard against double-start (React StrictMode, fast re-auth)
    if (heartbeatInterval && currentUserId === userId) return
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    currentUserId = userId

    const update = async () => {
      try {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          userId,
          {
            lastSeenAt: new Date().toISOString(),
            isOnline: true,
          },
        )
      } catch {
        // user doc may not have these fields yet
      }
    }

    await update()
    heartbeatInterval = setInterval(update, 15_000)
  },

  async stopPresenceHeartbeat(userId: string): Promise<void> {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    currentUserId = null
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        userId,
        { isOnline: false },
      )
    } catch {
      // degrade gracefully
    }
  },
}
