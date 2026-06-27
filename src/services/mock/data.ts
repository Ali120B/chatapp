import type { Chat, Friendship, Message, UserProfile } from '@/types'

export const MOCK_USER: UserProfile = {
  userId: 'test-1',
  username: 'TestUser',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser',
  createdAt: new Date().toISOString(),
}

export const MOCK_USERS: UserProfile[] = [
  MOCK_USER,
  {
    userId: 'user-2',
    username: 'Krishna',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krishna',
    createdAt: new Date().toISOString(),
  },
  {
    userId: 'user-3',
    username: 'Alex',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    createdAt: new Date().toISOString(),
  },
  {
    userId: 'user-4',
    username: 'Sam',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    createdAt: new Date().toISOString(),
  },
  {
    userId: 'user-5',
    username: 'Jordan',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    createdAt: new Date().toISOString(),
  },
]

export const MOCK_CHATS: Chat[] = [
  {
    $id: 'chat-1',
    chatId: 'chat-1',
    type: 'dm',
    name: 'Krishna',
    memberIds: ['test-1', 'user-2'],
    activeMemberIds: ['user-2'],
    encryptionKeyHint: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    deletedAt: null,
    lastMessage: 'Hey, are you online?',
    unreadCount: 2,
  },
  {
    $id: 'chat-2',
    chatId: 'chat-2',
    type: 'group_temp',
    name: 'Weekend Squad',
    memberIds: ['test-1', 'user-3', 'user-4'],
    activeMemberIds: ['user-3'],
    encryptionKeyHint: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    deletedAt: null,
    lastMessage: 'Anyone up for a game?',
    unreadCount: 0,
  },
  {
    $id: 'chat-3',
    chatId: 'chat-3',
    type: 'dm',
    name: 'Alex',
    memberIds: ['test-1', 'user-3'],
    activeMemberIds: [],
    encryptionKeyHint: null,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    deletedAt: null,
    lastMessage: 'Thanks!',
    unreadCount: 0,
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    {
      $id: 'msg-1',
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-2',
      content: 'Hey! How are you doing?',
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      $id: 'msg-2',
      messageId: 'msg-2',
      chatId: 'chat-1',
      senderId: 'test-1',
      content: "I'm good! Working on the chat overlay.",
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 3500000).toISOString(),
    },
    {
      $id: 'msg-3',
      messageId: 'msg-3',
      chatId: 'chat-1',
      senderId: 'user-2',
      content: 'Hey, are you online?',
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      $id: 'msg-3b',
      messageId: 'msg-3b',
      chatId: 'chat-1',
      senderId: 'test-1',
      content: 'Yeah! Just finishing the overlay.',
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 30000).toISOString(),
      replyToId: 'msg-3',
    },
  ],
  'chat-2': [
    {
      $id: 'msg-4',
      messageId: 'msg-4',
      chatId: 'chat-2',
      senderId: 'user-3',
      content: 'Anyone up for a game?',
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  'chat-3': [
    {
      $id: 'msg-5',
      messageId: 'msg-5',
      chatId: 'chat-3',
      senderId: 'user-3',
      content: 'Thanks!',
      imageFileId: null,
      isEncrypted: false,
      filteredWordCount: 0,
      sentAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
}

export const MOCK_FRIENDSHIPS: Friendship[] = [
  {
    $id: 'fr-1',
    fromUserId: 'test-1',
    toUserId: 'user-2',
    status: 'accepted',
    createdAt: new Date().toISOString(),
  },
  {
    $id: 'fr-2',
    fromUserId: 'test-1',
    toUserId: 'user-3',
    status: 'accepted',
    createdAt: new Date().toISOString(),
  },
  {
    $id: 'fr-3',
    fromUserId: 'user-4',
    toUserId: 'test-1',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
]

export const MOCK_ONLINE: Record<string, boolean> = {
  'user-2': true,
  'user-3': true,
  'user-4': false,
  'user-5': true,
}
