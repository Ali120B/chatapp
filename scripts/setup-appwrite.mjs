/**
 * One-time Appwrite provisioning for Chat Overlay.
 *
 * Usage:
 *   1. Copy .env.setup.example → .env.setup and fill in values
 *   2. npm run setup:appwrite
 *
 * NEVER commit .env.setup or paste API keys in chat.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Client,
  Databases,
  Storage,
  Project,
  Permission,
  Role,
  ID,
} from 'node-appwrite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(resolve(root, '.env.setup'))
loadEnvFile(resolve(root, '.env'))

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? 'https://cloud.appwrite.io/v1'
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? process.env.VITE_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID ?? 'chatapp'

const USER_COL = 'users'
const FRIENDSHIPS_COL = 'friendships'
const CHATS_COL = 'chats'
const MESSAGES_COL = 'messages'
const TYPING_COL = 'typing'
const CHAT_IMAGES_BUCKET = 'chat-images'

const USER_PERMS = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForAttribute(databases, collectionId, key, max = 30) {
  for (let i = 0; i < max; i++) {
    const col = await databases.getCollection(DATABASE_ID, collectionId)
    const attr = col.attributes?.find((a) => a.key === key)
    if (attr?.status === 'available') return
    if (attr?.status === 'failed') throw new Error(`Attribute ${collectionId}.${key} failed`)
    await sleep(1500)
  }
  throw new Error(`Timeout waiting for attribute ${collectionId}.${key}`)
}

async function ensureDatabase(databases) {
  try {
    await databases.get(DATABASE_ID)
    console.log(`✓ Database "${DATABASE_ID}" exists`)
  } catch {
    await databases.create({ databaseId: DATABASE_ID, name: 'Chat Overlay' })
    console.log(`+ Created database "${DATABASE_ID}"`)
  }
}

async function ensureCollection(databases, collectionId, name) {
  try {
    await databases.getCollection(DATABASE_ID, collectionId)
    console.log(`  ✓ Collection "${collectionId}" exists`)
  } catch {
    await databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId,
      name,
      permissions: USER_PERMS,
      documentSecurity: false,
    })
    console.log(`  + Created collection "${collectionId}"`)
  }
}

async function ensureString(databases, collectionId, key, size, required, array = false) {
  try {
    await databases.getAttribute(DATABASE_ID, collectionId, key)
  } catch {
    await databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      size,
      required,
      array,
      default: required ? undefined : array ? [] : undefined,
    })
    await waitForAttribute(databases, collectionId, key)
    console.log(`    + string ${key}${array ? '[]' : ''}`)
  }
}

async function ensureBool(databases, collectionId, key, required) {
  try {
    await databases.getAttribute(DATABASE_ID, collectionId, key)
  } catch {
    await databases.createBooleanAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      required,
      default: required ? undefined : false,
    })
    await waitForAttribute(databases, collectionId, key)
    console.log(`    + boolean ${key}`)
  }
}

async function ensureInt(databases, collectionId, key, required) {
  try {
    await databases.getAttribute(DATABASE_ID, collectionId, key)
  } catch {
    await databases.createIntegerAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      required,
      min: 0,
      max: 999999,
      default: required ? undefined : 0,
    })
    await waitForAttribute(databases, collectionId, key)
    console.log(`    + integer ${key}`)
  }
}

async function ensureIndex(databases, collectionId, key, type, attributes, orders) {
  try {
    await databases.getIndex(DATABASE_ID, collectionId, key)
  } catch {
    await databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      type,
      attributes,
      orders,
    })
    console.log(`    + index ${key}`)
    await sleep(2000)
  }
}

async function ensureBucket(storage, bucketId, name, maxMb, extensions) {
  try {
    await storage.getBucket(bucketId)
    console.log(`✓ Bucket "${bucketId}" exists`)
  } catch {
    await storage.createBucket({
      bucketId,
      name,
      permissions: USER_PERMS,
      fileSecurity: false,
      maximumFileSize: maxMb * 1024 * 1024,
      allowedFileExtensions: extensions,
      compression: 'none',
      encryption: false,
      antivirus: true,
    })
    console.log(`+ Created bucket "${bucketId}"`)
  }
}

async function ensureWebPlatform(project) {
  const hostname = process.env.APPWRITE_WEB_HOSTNAME ?? 'localhost'
  try {
    const list = await project.listPlatforms()
    const exists = list.platforms?.some((p) => p.hostname === hostname)
    if (exists) {
      console.log(`✓ Web platform "${hostname}" exists`)
      return
    }
    await project.createWebPlatform({
      platformId: ID.unique(),
      name: `Chat Overlay (${hostname})`,
      hostname,
    })
    console.log(`+ Added web platform for hostname "${hostname}"`)
  } catch (err) {
    console.warn(`! Could not auto-add web platform: ${err.message}`)
    console.warn(`  → In Console: Settings → Platforms → Add Web → hostname: ${hostname}`)
  }
}

async function writeAppEnv(projectId) {
  const envPath = resolve(root, '.env')
  const lines = [
    `VITE_APPWRITE_ENDPOINT=${ENDPOINT}`,
    `VITE_APPWRITE_PROJECT_ID=${projectId}`,
    `VITE_APPWRITE_DATABASE_ID=${DATABASE_ID}`,
    `VITE_APPWRITE_USERS_COLLECTION=${USER_COL}`,
    `VITE_APPWRITE_FRIENDSHIPS_COLLECTION=${FRIENDSHIPS_COL}`,
    `VITE_APPWRITE_CHATS_COLLECTION=${CHATS_COL}`,
    `VITE_APPWRITE_MESSAGES_COLLECTION=${MESSAGES_COL}`,
    `VITE_APPWRITE_STORAGE_BUCKET=${CHAT_IMAGES_BUCKET}`,
    '',
  ]
  const { writeFileSync } = await import('node:fs')
  writeFileSync(envPath, lines.join('\n'))
  console.log(`\n✓ Wrote ${envPath} (VITE_* vars for the app)`)
}

async function main() {
  if (!PROJECT_ID) {
    console.error('Missing APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID in .env.setup')
    process.exit(1)
  }
  if (!API_KEY) {
    console.error('Missing APPWRITE_API_KEY in .env.setup')
    process.exit(1)
  }

  console.log(`\nAppwrite setup — project ${PROJECT_ID}\n`)

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
  const databases = new Databases(client)
  const storage = new Storage(client)
  const project = new Project(client)

  await ensureWebPlatform(project)
  await ensureDatabase(databases)

  console.log('\nCollections:')
  await ensureCollection(databases, USER_COL, 'Users')
  await ensureString(databases, USER_COL, 'userId', 36, true)
  await ensureString(databases, USER_COL, 'username', 64, true)
  await ensureString(databases, USER_COL, 'avatarUrl', 2048, true)
  await ensureString(databases, USER_COL, 'avatarFileId', 36, false)
  await ensureString(databases, USER_COL, 'createdAt', 64, true)
  await ensureString(databases, USER_COL, 'lastSeenAt', 64, true)
  await ensureBool(databases, USER_COL, 'isOnline', true)
  await ensureIndex(databases, USER_COL, 'username_search', 'fulltext', ['username'], ['ASC'])

  await ensureCollection(databases, FRIENDSHIPS_COL, 'Friendships')
  await ensureString(databases, FRIENDSHIPS_COL, 'fromUserId', 36, true)
  await ensureString(databases, FRIENDSHIPS_COL, 'toUserId', 36, true)
  await ensureString(databases, FRIENDSHIPS_COL, 'status', 16, true)
  await ensureString(databases, FRIENDSHIPS_COL, 'createdAt', 64, true)
  await ensureIndex(databases, FRIENDSHIPS_COL, 'from_status', 'key', ['fromUserId', 'status'], ['ASC', 'ASC'])
  await ensureIndex(databases, FRIENDSHIPS_COL, 'to_status', 'key', ['toUserId', 'status'], ['ASC', 'ASC'])

  await ensureCollection(databases, CHATS_COL, 'Chats')
  await ensureString(databases, CHATS_COL, 'chatId', 36, true)
  await ensureString(databases, CHATS_COL, 'type', 24, true)
  await ensureString(databases, CHATS_COL, 'name', 128, false)
  await ensureString(databases, CHATS_COL, 'memberIds', 36, true, true)
  await ensureString(databases, CHATS_COL, 'activeMemberIds', 36, true, true)
  await ensureString(databases, CHATS_COL, 'adminIds', 36, false, true)
  await ensureString(databases, CHATS_COL, 'encryptionKeyHint', 256, false)
  await ensureString(databases, CHATS_COL, 'createdAt', 64, true)
  await ensureString(databases, CHATS_COL, 'deletedAt', 64, false)
  await ensureString(databases, CHATS_COL, 'expiresAt', 64, false)
  await ensureString(databases, CHATS_COL, 'hiddenForUserIds', 36, false, true)
  await ensureString(databases, CHATS_COL, 'description', 512, false)
  // Note: Appwrite does not support indexes on array attributes (memberIds)

  await ensureCollection(databases, MESSAGES_COL, 'Messages')
  await ensureString(databases, MESSAGES_COL, 'messageId', 36, true)
  await ensureString(databases, MESSAGES_COL, 'chatId', 36, true)
  await ensureString(databases, MESSAGES_COL, 'senderId', 36, true)
  await ensureString(databases, MESSAGES_COL, 'content', 16384, true)
  await ensureString(databases, MESSAGES_COL, 'imageFileId', 36, false)
  await ensureBool(databases, MESSAGES_COL, 'isEncrypted', true)
  await ensureInt(databases, MESSAGES_COL, 'filteredWordCount', true)
  await ensureString(databases, MESSAGES_COL, 'sentAt', 64, true)
  await ensureString(databases, MESSAGES_COL, 'replyToId', 36, false)
  await ensureString(databases, MESSAGES_COL, 'deletedForUserIds', 36, false, true)
  await ensureString(databases, MESSAGES_COL, 'reactions', 4096, false)
  await ensureString(databases, MESSAGES_COL, 'messageType', 16, false)
  await ensureString(databases, MESSAGES_COL, 'pollData', 16384, false)
  await ensureString(databases, MESSAGES_COL, 'editedAt', 64, false)
  await ensureString(databases, MESSAGES_COL, 'readBy', 36, false, true)
  await ensureIndex(databases, MESSAGES_COL, 'chat_sent', 'key', ['chatId', 'sentAt'], ['ASC', 'DESC'])

  console.log('\n  Typing collection:')
  await ensureCollection(databases, TYPING_COL, 'Typing')
  await ensureString(databases, TYPING_COL, 'chatId', 36, true)
  await ensureString(databases, TYPING_COL, 'userId', 36, true)
  await ensureString(databases, TYPING_COL, 'username', 64, true)
  await ensureString(databases, TYPING_COL, 'expiresAt', 64, true)

  console.log('\nStorage:')
  await ensureBucket(storage, CHAT_IMAGES_BUCKET, 'Chat Images', 5, ['jpg', 'jpeg', 'png', 'gif', 'webp'])

  await writeAppEnv(PROJECT_ID)

  console.log(`
Done! Next steps:
  1. In Appwrite Console → Auth → enable Email/Password
  2. cd App && npm run dev
  3. Sign up in the app (do NOT use Test Mode — it has been removed)
`)
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message ?? err)
  process.exit(1)
})
