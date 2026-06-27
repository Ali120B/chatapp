# Appwrite Setup Guide — Chat Overlay

> Connect the app to **Appwrite Cloud** (or self-hosted) so auth, chats, messages, friends, images, and realtime work outside Test Mode.

**Time:** ~30–45 minutes first time  
**Code expects:** Appwrite **Databases** (collections API) — already wired in `src/services/`

---

## 1. Create the Appwrite project

1. Go to [https://cloud.appwrite.io](https://cloud.appwrite.io) and sign in (or create an account).
2. **Create project** → name it e.g. `Chat Overlay`.
3. Copy the **Project ID** from **Settings → General**.

---

## 2. Enable Auth (email + password)

1. Open **Auth** in the sidebar.
2. Enable **Email/Password** provider.
3. (Optional) Disable email verification for dev: **Auth → Settings** → turn off “Email verification” while testing.

The app uses:
- `account.create()` — signup
- `account.createEmailPasswordSession()` — login
- `account.get()` — session restore

---

## 3. Create the database

1. **Databases → Create database**
2. Name: `chatapp` (or any name — must match `.env`)
3. Copy the **Database ID** (often looks like `chatapp` or a generated id).

---

## 4. Create collections & attributes

Create **four collections** inside `chatapp`.  
For each collection: **Settings → Permissions** → add role **`Users`** (or `Any` authenticated) with **Create, Read, Update, Delete** for initial dev. Tighten per-document rules later.

> Attribute types in Console: **String**, **Boolean**, **Integer**, **String[]** (array).  
> Sizes: strings default 255 unless noted. `content` needs **10000+** for encrypted payloads.

### Collection: `users`

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `userId` | String | ✅ | Same as Appwrite Auth user `$id` |
| `username` | String | ✅ | Display name |
| `avatarUrl` | String | ✅ | Public URL — Dicebear default or Storage view URL |
| `avatarFileId` | String | ❌ | Storage file id in `chat-images` when user uploads pfp |
| `createdAt` | String | ✅ | ISO datetime |

**Indexes**
- `username` — **Full text** (for search in Friends)

**Document ID:** On create, the app uses Auth user id as document id (`userId`).

---

### Collection: `friendships`

| Attribute | Type | Required |
|-----------|------|----------|
| `fromUserId` | String | ✅ |
| `toUserId` | String | ✅ |
| `status` | String | ✅ | `pending` \| `accepted` \| `blocked` |

**Blocking:** set `status: blocked` when a user blocks someone. Blocked users must not appear in search, receive DMs, or send friend requests (enforce in app + optional Appwrite Function).

**Indexes**
- `fromUserId` + `status`
- `toUserId` + `status`

---

### Collection: `chats`

| Attribute | Type | Required |
|-----------|------|----------|
| `chatId` | String | ✅ | Internal chat uuid |
| `type` | String | ✅ | `dm` \| `group_temp` \| `group_persist` |
| `name` | String | ❌ | Nullable — DM display name |
| `memberIds` | String[] | ✅ | All members |
| `activeMemberIds` | String[] | ✅ | Currently in chat |
| `adminIds` | String[] | ✅ | **Group admins only** — edit name/details, add/remove members |
| `encryptionKeyHint` | String | ❌ | Nullable |
| `createdAt` | String | ✅ |
| `deletedAt` | String | ❌ | Nullable soft delete |
| `expiresAt` | String | ❌ | Optional — temp groups (future) |

**Indexes**
- `memberIds` — **Array contains** (critical for listing user’s chats)

---

### Collection: `messages`

| Attribute | Type | Required |
|-----------|------|----------|
| `messageId` | String | ✅ |
| `chatId` | String | ✅ |
| `senderId` | String | ✅ |
| `content` | String | ✅ | Size **16384** recommended |
| `imageFileId` | String | ❌ | Storage file id |
| `isEncrypted` | Boolean | ✅ |
| `filteredWordCount` | Integer | ✅ |
| `sentAt` | String | ✅ |
| `replyToId` | String | ❌ | Reply threading (UI already uses this) |
| `deletedForUserIds` | String[] | ❌ | Per-user "delete for me" — hide message for these users |

**Delete for everyone:** only the **sender** may hard-delete a message for all chat members. Enforce in app code / Function: `forAll` requires `senderId === currentUser.id`. UI already hides "Delete for everyone" on others' messages.

**Indexes**
- `chatId` + `sentAt` (desc) — for pagination

**Future (not required day one)**
- `forwardedFromMessageId`, `forwardedFromChatId`
- `reactions` — String (JSON) or separate `message_reactions` collection (see `db_task.md`)

---

## 5. Storage buckets

### `chat-images` (message attachments)

1. **Storage → Create bucket** → id: `chat-images`
2. **Max file size:** 5 MB
3. **Allowed extensions:** jpg, jpeg, png, gif, webp
4. **Permissions:** `Users` — Create, Read (dev)

### Profile photos reuse `chat-images`

1. The app stores both message images and profile photos in the same bucket: `chat-images`
2. Profile photo uploads are still limited client-side to **2 MB**
3. Keep `chat-images` extensions broad enough for both flows: jpg, jpeg, png, gif, webp
4. On signup the app uses an empty/default avatar until the user uploads one
5. When a profile photo is uploaded, the app writes `users.avatarFileId` + `users.avatarUrl` from the `chat-images` bucket

---

## 6. Enable Realtime

1. **Databases → your database → Settings**
2. Enable **Realtime** for collections `messages` and `chats`.

The app subscribes in `src/services/realtime.ts` to:
- `databases.{db}.collections.messages.documents`
- `databases.{db}.collections.chats.documents`

---

## 7. Connect the app (`.env`)

```bash
cd App
cp .env.example .env
```

Edit `App/.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=paste_your_project_id_here
VITE_APPWRITE_DATABASE_ID=chatapp
VITE_APPWRITE_USERS_COLLECTION=users
VITE_APPWRITE_FRIENDSHIPS_COLLECTION=friendships
VITE_APPWRITE_CHATS_COLLECTION=chats
VITE_APPWRITE_MESSAGES_COLLECTION=messages
VITE_APPWRITE_STORAGE_BUCKET=chat-images
```

If your Database ID in Console is **not** literally `chatapp`, paste the real id into `VITE_APPWRITE_DATABASE_ID`.

Restart dev server after changing `.env`:

```bash
npm run dev
```

---

## 8. First login (leave Test Mode)

1. Open the overlay → bubble → **do not** click “Enter Test Mode”.
2. **Sign up** with email + password + username.
3. Appwrite Auth user is created → profile doc written to `users` collection.
4. Send a message — should appear in **Databases → messages** in Console.

`isAppwriteConfigured()` returns true when `VITE_APPWRITE_PROJECT_ID` is set and not `your_project_id`.

---

## 9. Two-user test (realtime)

1. Sign up **User A** in one browser/profile.
2. Sign up **User B** in another (incognito or second machine).
3. User A searches User B in **Friends → Add**, sends request.
4. User B accepts → start DM → messages should sync via Realtime.

---

## 10. Self-hosted Appwrite (optional)

If you run Appwrite on your own server:

```env
VITE_APPWRITE_ENDPOINT=https://appwrite.yourdomain.com/v1
```

Same collections/schema. Ensure CORS allows your dev origin (`http://localhost:5173`) in Appwrite **Settings → Platforms** → add **Web** platform with hostname `localhost`.

For Electron production builds, add your app origin or use a custom protocol if applicable.

---

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stuck on Test Mode only | Check `.env` project id; restart `npm run dev` |
| `401 Unauthorized` | Not logged in — signup/login first |
| `Collection not found` | Collection **id** in Console must match env vars exactly |
| `Invalid document structure` | Missing attribute or wrong type in collection |
| `memberIds` query empty | Add **array contains** index on `chats.memberIds` |
| Friends search empty | Add **fulltext** index on `users.username` |
| Realtime not firing | Enable Realtime on database; check browser console |
| Image upload fails | Bucket id + Create permission on `chat-images` |
| CORS error | Add Web platform in Appwrite with your hostname |

---

## Rules summary (product)

| Rule | UI | Backend |
|------|-----|---------|
| **Group admin** | Add/remove member buttons admin-only in group details | `adminIds[]` on chat; reject non-admin mutations |
| **Block user** | Not built yet | `friendships.status = blocked`; block DMs/search |
| **Delete for everyone** | Only on **your** messages | `forAll` only if `senderId === you` |
| **Delete for me** | Any message | `deletedForUserIds` or user-specific hide |
| **Profile photo** | Dicebear placeholder | Upload to `chat-images` → `avatarFileId` |

---

## 12. Security checklist (before production)

- [ ] Replace wide `Users` CRUD with **document-level permissions** (only `memberIds` can read chat/message docs)
- [ ] Enable email verification
- [ ] Rate-limit message creates (Appwrite Functions or Abuse API)
- [ ] Never store encryption passphrase server-side (client only)
- [ ] Review Storage bucket — don’t expose private images publicly

---

## Quick reference — what the code calls

| Feature | Service file |
|---------|----------------|
| Login / signup | `src/services/auth.ts` |
| Chats & messages | `src/services/chats.ts` |
| Friends | `src/services/friends.ts` |
| Realtime | `src/services/realtime.ts` |
| Config | `src/services/appwrite.ts` |

Next backend work (reactions, forward metadata, temp group expiry): see **`db_task.md`**.
