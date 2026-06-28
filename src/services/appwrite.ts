import {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Query,
  type Models,
} from 'appwrite'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT ?? 'https://cloud.appwrite.io/v1'
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID ?? ''

export const APPWRITE_CONFIG = {
  endpoint,
  projectId,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID ?? 'chatapp',
  collections: {
    users: import.meta.env.VITE_APPWRITE_USERS_COLLECTION ?? 'users',
    friendships: import.meta.env.VITE_APPWRITE_FRIENDSHIPS_COLLECTION ?? 'friendships',
    chats: import.meta.env.VITE_APPWRITE_CHATS_COLLECTION ?? 'chats',
    messages: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION ?? 'messages',
  },
  storageBucket: import.meta.env.VITE_APPWRITE_STORAGE_BUCKET ?? 'chat-images',
} as const

export const client = new Client().setEndpoint(endpoint).setProject(projectId)

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

export function isAppwriteConfigured(): boolean {
  return Boolean(projectId && projectId !== 'your_project_id')
}

export { ID, Query, type Models }
