import {
  databases,
  storage,
  APPWRITE_CONFIG,
  ID,
  Query,
} from './appwrite'
import type { Friendship, FriendshipRelation, UserProfile } from '@/types'

export type UserSearchResult = UserProfile & { friendshipStatus: FriendshipRelation }

export const appwriteFriendsService = {
  async searchUsers(query: string, excludeUserId: string): Promise<UserSearchResult[]> {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.users,
      [Query.search('username', query), Query.limit(20)],
    )
    const profiles = res.documents
      .filter((d) => (d.userId as string) !== excludeUserId)
      .map(docToProfile)

    const results: UserSearchResult[] = []
    for (const profile of profiles) {
      const status = await getFriendshipRelation(excludeUserId, profile.userId)
      results.push({ ...profile, friendshipStatus: status })
    }
    return results
  },

  async getFriends(userId: string): Promise<UserProfile[]> {
    const sent = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      [Query.equal('fromUserId', userId), Query.equal('status', 'accepted')],
    )
    const received = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      [Query.equal('toUserId', userId), Query.equal('status', 'accepted')],
    )

    const friendIds = [
      ...sent.documents.map((d) => d.toUserId as string),
      ...received.documents.map((d) => d.fromUserId as string),
    ]

    const profiles: UserProfile[] = []
    for (const id of friendIds) {
      try {
        const doc = await databases.getDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          id,
        )
        profiles.push(docToProfile(doc))
      } catch {
        // user doc missing
      }
    }
    return profiles
  },

  async getPendingRequests(userId: string): Promise<
    Array<Friendship & { fromUser?: UserProfile }>
  > {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      [Query.equal('toUserId', userId), Query.equal('status', 'pending')],
    )

    const results: Array<Friendship & { fromUser?: UserProfile }> = []
    for (const doc of res.documents) {
      const friendship = docToFriendship(doc)
      let fromUser: UserProfile | undefined
      try {
        const userDoc = await databases.getDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          friendship.fromUserId,
        )
        fromUser = docToProfile(userDoc)
      } catch {
        // missing profile
      }
      results.push({ ...friendship, fromUser })
    }
    return results
  },

  async sendRequest(fromUserId: string, toUserId: string): Promise<void> {
    const status = await getFriendshipRelation(fromUserId, toUserId)
    if (status === 'friends') {
      throw new Error('You are already friends')
    }
    if (status === 'pending_sent') {
      return
    }
    if (status === 'pending_received') {
      throw new Error('This user already sent you a request')
    }
    if (status === 'blocked') {
      throw new Error('Cannot send request to this user')
    }

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      ID.unique(),
      {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    )
  },

  async acceptRequest(friendshipId: string): Promise<void> {
    await databases.updateDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      friendshipId,
      { status: 'accepted' },
    )
  },

  async rejectRequest(friendshipId: string): Promise<void> {
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      friendshipId,
    )
  },

  async removeFriend(userId: string, friendUserId: string): Promise<void> {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      [
        Query.or([
          Query.and([
            Query.equal('fromUserId', userId),
            Query.equal('toUserId', friendUserId),
            Query.equal('status', 'accepted'),
          ]),
          Query.and([
            Query.equal('fromUserId', friendUserId),
            Query.equal('toUserId', userId),
            Query.equal('status', 'accepted'),
          ]),
        ]),
      ],
    )
    for (const doc of res.documents) {
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.friendships,
        doc.$id,
      )
    }
  },

  async blockUser(fromUserId: string, toUserId: string): Promise<void> {
    const existing = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      [
        Query.or([
          Query.and([
            Query.equal('fromUserId', fromUserId),
            Query.equal('toUserId', toUserId),
          ]),
          Query.and([
            Query.equal('fromUserId', toUserId),
            Query.equal('toUserId', fromUserId),
          ]),
        ]),
      ],
    )

    for (const doc of existing.documents) {
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.friendships,
        doc.$id,
      )
    }

    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.collections.friendships,
      ID.unique(),
      {
        fromUserId,
        toUserId,
        status: 'blocked',
        createdAt: new Date().toISOString(),
      },
    )
  },
}

async function getFriendshipRelation(
  userId: string,
  otherUserId: string,
): Promise<FriendshipRelation> {
  const res = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    APPWRITE_CONFIG.collections.friendships,
    [
      Query.or([
        Query.and([
          Query.equal('fromUserId', userId),
          Query.equal('toUserId', otherUserId),
        ]),
        Query.and([
          Query.equal('fromUserId', otherUserId),
          Query.equal('toUserId', userId),
        ]),
      ]),
      Query.limit(1),
    ],
  )

  if (res.documents.length === 0) return 'none'

  const doc = res.documents[0]
  const status = doc.status as Friendship['status']
  if (status === 'accepted') return 'friends'
  if (status === 'blocked') return 'blocked'
  if (status === 'pending') {
    return doc.fromUserId === userId ? 'pending_sent' : 'pending_received'
  }
  return 'none'
}

function docToProfile(doc: Record<string, unknown>): UserProfile {
  const avatarFileId = doc.avatarFileId as string | undefined
  const avatarUrl = avatarFileId
    ? String(storage.getFileView(APPWRITE_CONFIG.storageBucket, avatarFileId))
    : (doc.avatarUrl as string)
  return {
    userId: doc.userId as string,
    username: doc.username as string,
    avatarUrl,
    createdAt: doc.createdAt as string,
  }
}

function docToFriendship(doc: Record<string, unknown>): Friendship {
  return {
    $id: doc.$id as string,
    fromUserId: doc.fromUserId as string,
    toUserId: doc.toUserId as string,
    status: doc.status as Friendship['status'],
    createdAt: doc.createdAt as string,
  }
}
