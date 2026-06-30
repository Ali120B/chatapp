import { databases, APPWRITE_CONFIG, storage, ID } from './appwrite'
import type { UserProfile } from '@/types'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export async function updateUserAvatar(userId: string, file: File): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Profile photo must be under 2 MB')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }

  const bucket = APPWRITE_CONFIG.storageBucket
  const uploaded = await storage.createFile(bucket, ID.unique(), file)
  const avatarUrl = String(storage.getFileView(bucket, uploaded.$id))

  await databases.updateDocument(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.users,
    userId,
    { avatarUrl },
  )

  return avatarUrl
}

export async function getProfilesByIds(userIds: string[]): Promise<UserProfile[]> {
  const profiles: UserProfile[] = []
  for (const id of userIds) {
    try {
      const doc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        id,
      )
      profiles.push({
        userId: doc.userId as string,
        username: doc.username as string,
        avatarUrl: doc.avatarUrl as string,
        createdAt: doc.createdAt as string,
      })
    } catch {
      // profile missing
    }
  }
  return profiles
}
