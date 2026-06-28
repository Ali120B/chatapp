import {
  account,
  databases,
  storage,
  APPWRITE_CONFIG,
  ID,
  isAppwriteConfigured,
} from './appwrite'
import type { UserProfile } from '@/types'
import { EMPTY_AVATAR } from '@/utils/avatar'

export interface LoginResult {
  user: UserProfile
  email: string
  needsVerification: boolean
}

export interface SessionState {
  email: string
  needsVerification: boolean
}

function verificationRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'chatoverlay://verify'
  }
  return `${window.location.origin}/verify`
}

async function getAuthAccount() {
  return account.get()
}

export const appwriteAuthService = {
  async login(email: string, password: string): Promise<LoginResult> {
    await account.createEmailPasswordSession(email, password)
    const authUser = await getAuthAccount()
    const needsVerification = false
    const profile = await getOrCreateProfile(authUser.$id, authUser.name ?? email)
    return { user: profile, email, needsVerification }
  },

  async signup(
    email: string,
    password: string,
    username: string,
  ): Promise<LoginResult> {
    await account.create(ID.unique(), email, password, username)
    await account.createEmailPasswordSession(email, password)
    const authUser = await getAuthAccount()
    const needsVerification = false
    const profile = await createProfile(authUser.$id, username)
    return { user: profile, email, needsVerification }
  },

  async getSessionState(): Promise<SessionState | null> {
    if (!isAppwriteConfigured()) return null
    try {
      const authUser = await getAuthAccount()
      return {
        email: authUser.email,
        needsVerification: false,
      }
    } catch {
      return null
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!isAppwriteConfigured()) return null
    try {
      const authUser = await getAuthAccount()
      const doc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        authUser.$id,
      )
      return docToProfile(doc)
    } catch {
      return null
    }
  },

  async logout(): Promise<void> {
    try {
      await account.deleteSession('current')
    } catch {
      // session may already be gone
    }
  },

  async deleteAccount(): Promise<void> {
    const authUser = await account.get()
    try {
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        authUser.$id,
      )
    } catch {
      // profile may already be missing
    }
    await account.updateStatus()
  },
}

async function getOrCreateProfile(userId: string, fallbackName: string): Promise<UserProfile> {
  try {
    const doc = await databases.getDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.users,
      userId,
    )
    return docToProfile(doc)
  } catch {
    return createProfile(userId, fallbackName)
  }
}

async function createProfile(userId: string, username: string): Promise<UserProfile> {
  const avatarUrl = EMPTY_AVATAR
  const doc = await databases.createDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.users,
    userId,
    {
      userId,
      username,
      avatarUrl,
      createdAt: new Date().toISOString(),
    },
  )
  return docToProfile(doc)
}

function docToProfile(doc: Record<string, unknown>): UserProfile {
  return {
    userId: doc.userId as string,
    username: doc.username as string,
    avatarUrl: doc.avatarUrl as string,
    createdAt: doc.createdAt as string,
  }
}

export { storage, APPWRITE_CONFIG }
