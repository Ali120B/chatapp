export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export type ChatType = 'dm' | 'group_temp' | 'group_persist'

export type AppView = 'home' | 'friends' | 'settings' | 'chat' | 'groupDetails' | 'forward'

export type NavTab = 'chats' | 'friends' | 'settings'

export type SnapSide = 'left' | 'right'

export type FriendsSubTab = 'search' | 'list'

export type FriendshipRelation =
  | 'none'
  | 'friends'
  | 'pending_sent'
  | 'pending_received'
  | 'blocked'

export interface UserProfile {
  userId: string
  username: string
  avatarUrl: string
  createdAt: string
}

export interface Friendship {
  $id: string
  fromUserId: string
  toUserId: string
  status: FriendshipStatus
  createdAt: string
}

export interface Chat {
  $id: string
  chatId: string
  type: ChatType
  name: string | null
  memberIds: string[]
  activeMemberIds: string[]
  encryptionKeyHint: string | null
  createdAt: string
  deletedAt: string | null
  adminIds?: string[]
  expiresAt?: string | null
  hiddenForUserIds?: string[]
  lastMessage?: string
  lastMessageAt?: string
  description?: string
  unreadCount?: number
}

export type MessageType = 'text' | 'image' | 'poll'

export interface PollSettings {
  showWhoVoted: boolean
  allowMultipleAnswers: boolean
  allowAddingOptions: boolean
  allowRevoting: boolean
  shuffleOptions: boolean
  setCorrectAnswer: boolean
}

export interface PollOption {
  id: string
  text: string
}

export interface PollData {
  question: string
  description: string
  options: PollOption[]
  settings: PollSettings
  correctOptionIds: string[]
  votes: Record<string, string[]>
}

export interface Message {
  $id: string
  messageId: string
  chatId: string
  senderId: string
  content: string
  imageFileId: string | null
  isEncrypted: boolean
  filteredWordCount: number
  sentAt: string
  replyToId?: string | null
  reactions?: Record<string, string[]>
  deletedForUserIds?: string[]
  messageType?: MessageType
  pollData?: PollData | null
  editedAt?: string | null
  readBy?: string[]
}

export interface Position {
  x: number
  y: number
}

export interface SanitizeResult {
  sanitized: string
  filteredCount: number
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  salt: string
}

export interface AuthSession {
  userId: string
  email: string
}
