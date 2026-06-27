import type { Chat, UserProfile } from '@/types'

export function getDmOtherUserId(chat: Chat, currentUserId: string): string | null {
  if (chat.type !== 'dm') return null
  return chat.memberIds.find((id) => id !== currentUserId) ?? null
}

export function getChatDisplayName(
  chat: Chat,
  currentUser: Pick<UserProfile, 'userId' | 'username'>,
  profileById: Map<string, Pick<UserProfile, 'username'>>,
): string {
  if (chat.type !== 'dm') {
    return chat.name?.trim() || 'Group'
  }

  const otherUserId = getDmOtherUserId(chat, currentUser.userId)
  if (!otherUserId) return 'Direct Message'

  const otherProfile = profileById.get(otherUserId)
  if (otherProfile?.username?.trim()) {
    return otherProfile.username.trim()
  }

  const storedName = chat.name?.trim()
  if (storedName && storedName !== currentUser.username) {
    return storedName
  }

  return 'Deleted account'
}
