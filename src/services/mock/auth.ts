import type { Friendship, UserProfile } from '@/types'
import { MOCK_USER, MOCK_USERS, MOCK_FRIENDSHIPS, MOCK_ONLINE } from './data'

export interface LoginResult {
  user: UserProfile
  email: string
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockAuthService = {
  async login(_email: string, _password: string): Promise<LoginResult> {
    await delay(400)
    return { user: MOCK_USER, email: _email }
  },

  async signup(
    email: string,
    _password: string,
    username: string,
  ): Promise<LoginResult> {
    await delay(400)
    return {
      user: { ...MOCK_USER, username },
      email,
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    return null
  },

  async logout(): Promise<void> {
    await delay(200)
  },

  enterTestMode(): LoginResult {
    return { user: MOCK_USER, email: 'test@local.dev' }
  },
}

export const mockFriendsService = {
  async searchUsers(query: string): Promise<UserProfile[]> {
    await delay(200)
    const q = query.toLowerCase()
    return MOCK_USERS.filter(
      (u) => u.userId !== MOCK_USER.userId && u.username.toLowerCase().includes(q),
    )
  },

  async getFriends(): Promise<UserProfile[]> {
    await delay(200)
    const friendIds = MOCK_FRIENDSHIPS.filter((f) => f.status === 'accepted')
      .flatMap((f) => [f.fromUserId, f.toUserId])
      .filter((id) => id !== MOCK_USER.userId)
    return MOCK_USERS.filter((u) => friendIds.includes(u.userId))
  },

  async getPendingRequests(): Promise<
    Array<Friendship & { fromUser?: UserProfile }>
  > {
    await delay(200)
    return MOCK_FRIENDSHIPS.filter(
      (f) => f.status === 'pending' && f.toUserId === MOCK_USER.userId,
    ).map((f) => ({
      ...f,
      fromUser: MOCK_USERS.find((u) => u.userId === f.fromUserId),
    }))
  },

  async sendRequest(toUserId: string): Promise<void> {
    await delay(200)
    MOCK_FRIENDSHIPS.push({
      $id: `fr-${Date.now()}`,
      fromUserId: MOCK_USER.userId,
      toUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  },

  async acceptRequest(friendshipId: string): Promise<void> {
    await delay(200)
    const f = MOCK_FRIENDSHIPS.find((fr) => fr.$id === friendshipId)
    if (f) f.status = 'accepted'
  },

  async rejectRequest(friendshipId: string): Promise<void> {
    await delay(200)
    const idx = MOCK_FRIENDSHIPS.findIndex((fr) => fr.$id === friendshipId)
    if (idx >= 0) MOCK_FRIENDSHIPS.splice(idx, 1)
  },

  getOnlineStatus(): Record<string, boolean> {
    return { ...MOCK_ONLINE }
  },
}
