# New Features Required — Orbix Chat Overlay

> Plan document. No code changes yet. All features listed below are **not implemented**.

---

## 1. Window Model Fix (Hyprland / Tiling WM Support)

### Problem
The Electron window is created as a **fullscreen transparent overlay** (`workArea.width × workArea.height`) with `frame: false`, `transparent: true`, `focusable: false`, and `setIgnoreMouseEvents(true)`. The bubble and chat window are HTML elements positioned inside this fullscreen canvas.

On Hyprland (a tiling WM), this fullscreen window:
- Takes up an entire workspace
- Conflicts with tiling layout
- Requires clicking 2-3 times to interact (focus issues with tiling WM focus model)
- Is redundant — Hyprland already handles floating windows natively

### Solution
Convert the window from a fullscreen overlay to a **small, native-positioned floating Electron window** that Hyprland can manage like any normal floating window.

### Changes Required

#### `electron/main.cjs` — `createWindow()`
- Remove fullscreen sizing (`workArea.width / height`)
- Set a small initial window size: just the bubble size (48x48) or slightly larger (maybe 200x200 to give room for the chat window to expand)
- Remove `setIgnoreMouseEvents(true)` from startup — let the WM handle click-through
- Remove `focusable: false` — let the window be focusable normally
- Keep `frame: false` (custom glass UI) and `transparent: true`
- Keep `alwaysOnTop: true` and `skipTaskbar: true`
- Use `setPosition()` to place window at the last-known bubble position
- Remove `setVisibleOnAllWorkspaces(true)` — not needed on Wayland/Hyprland

#### `electron/main.cjs` — Window resizing
- When chat window opens, resize the Electron window to fit both bubble + chat panel
- New IPC: `resize-overlay(width, height)` in preload + main
- Main process calls `mainWindow.setSize(width, height)` and `mainWindow.setPosition()` to keep it centered

#### `electron/main.cjs` — Remove mouse passthrough
- Remove `setIgnoreMouseEvents` IPC handler entirely
- The entire small window IS the interactive area — no need for hit-test passthrough

#### `electron/preload.cjs`
- Add `setPosition(x, y)` — calls `ipcRenderer.send('set-window-position', x, y)`
- Add `getSize()` — returns current window size
- Remove `setIgnoreMouseEvents` (no longer needed)

#### `electron/main.cjs` — New IPC handlers
- `set-window-position`: `mainWindow.setPosition(x, y)`
- `resize-overlay`: `mainWindow.setSize(width, height)` + center on bubble
- `get-window-position`: returns `mainWindow.getPosition()`

#### `src/hooks/useMousePassthrough.ts`
- **Delete this file** — no longer needed

#### `src/hooks/useOverlayDrag.ts`
- Dragging the bubble now moves the **Electron window** via `setPosition()` IPC
- On drag: send `set-window-position(x, y)` to main process
- Persist final position to localStorage

#### `src/store/uiStore.ts`
- Remove `getOverlayDimensions()` — no longer computing overlay bounds
- On `openWindow()`: send IPC to resize window to fit bubble + chat panel
- On `closeWindow()`: send IPC to resize window back to bubble-only size
- `initBubblePosition()`: read position from localStorage, default to center-right

#### `src/utils/overlayBounds.ts`
- Keep `computeChatWindowPos()` for positioning the chat div within the window
- The chat panel is a child div inside the same window, positioned above/below the bubble

#### `src/components/overlay/FloatingBubble.tsx`
- Bubble fills the small Electron window
- Remove `fixed` positioning — bubble IS the window content at (0,0)

#### `src/components/overlay/ChatWindow.tsx`
- Chat panel renders as a sibling to the bubble within the same window
- Positioned above or below the bubble using `computeChatWindowPos()`

### Summary
| Before | After |
|--------|-------|
| Fullscreen transparent window | Small floating window (~200x200, resizes with chat) |
| Bubble = HTML element at absolute pos in fullscreen | Bubble = fills the small window, window IS at bubble pos |
| `setIgnoreMouseEvents` click-through | WM handles focus/click natively |
| `focusable: false` default | `focusable: true` always |
| Custom drag moves HTML position | Drag moves Electron window via IPC |
| `setVisibleOnAllWorkspaces` | Remove — Hyprland manages workspace |

---

## 2. Message Edit

### What
Users can edit their own messages. Edited messages show "(edited)" indicator.

### Appwrite Schema Changes
- **No new fields needed** for existing attributes
- Add `editedAt` field: `string(64)`, optional, stores ISO timestamp of last edit

#### `scripts/setup-appwrite.mjs`
- Add `ensureString(databases, MESSAGES_COL, 'editedAt', 64, false)` after existing attributes

### Type Changes
#### `src/types/index.ts`
- Add `editedAt?: string | null` to `Message` interface

### Service Layer
#### `src/services/chats.ts`
- Add `editMessage(messageId: string, userId: string, newContent: string): Promise<Message>`
  - Fetch message, verify `senderId === userId`
  - Run through `sanitizeMessage()` for profanity filter
  - `databases.updateDocument()` with `{ content: sanitized, editedAt: new Date().toISOString() }`
  - Return updated `Message`

### Store Layer
#### `src/store/chatStore.ts`
- Add `editMessage: (messageId: string, newContent: string) => Promise<void>` action
  - Call `appwriteChatService.editMessage()`
  - Update local state via `applyMessageUpdate()`

### UI Changes
#### `src/components/chat/MessageContextMenu.tsx`
- Add "Edit" menu item (only visible when `isSelf === true && message.messageType === 'text'`)
- New prop: `onEdit: (msg: Message) => void`

#### `src/components/chat/MessageList.tsx`
- Pass `onEdit` through to `MessageContextMenu`

#### `src/components/chat/ChatView.tsx`
- Add edit mode state: `editingMessage: Message | null`
- When editing: pre-fill `MessageInput` with existing content, change send behavior to call `editMessage()` instead of `sendMessage()`
- Show "Editing message" banner above input (like reply preview)

#### `src/components/chat/MessageBubble.tsx`
- After message content, if `message.editedAt`, show small "(edited)" text in `text-[9px] text-[#A0A4A8]/60`

#### `src/components/chat/MessageInput.tsx`
- Accept optional `initialText` prop for pre-filling in edit mode
- Accept `onCancelEdit` prop to exit edit mode

### Realtime
- Already handled — `applyMessageUpdate()` in `chatStore.ts` processes incoming updates via realtime subscription

---

## 3. Real Typing Indicators

### What
When a user is typing in the message input, other chat members see "X is typing..." in real-time.

### Architecture
Typing indicators are **ephemeral** — they should NOT be stored in the Appwrite database long-term (too many writes). Use a dedicated `typing` collection with short-lived documents that auto-expire.

### Approach: Ephemeral Collection
Create a `typing` collection where each document represents "user X is typing in chat Y" with a short TTL.

#### Appwrite Schema — New Collection: `typing`
- `chatId`: string(36), required
- `userId`: string(36), required
- `username`: string(64), required — denormalized for display
- `expiresAt`: string(64), required — ISO timestamp, 5 seconds from last keystroke

Permissions: same `Role.users()` pattern.

#### `scripts/setup-appwrite.mjs`
- Add `ensureCollection(databases, 'typing', 'Typing')` with attributes above

### Service Layer
#### `src/services/typing.ts` (new file)
- `setTyping(chatId, userId, username)` — upsert document (create or update `expiresAt` to `now + 5s`)
- `clearTyping(chatId, userId)` — delete the document
- `subscribeToTyping(chatId, callback)` — subscribe to realtime events on `typing` collection
  - On `create`/`update`: add user to typing list
  - On `delete`: remove user from typing list
  - Auto-remove stale entries (where `expiresAt < now`)

### Store Layer
#### `src/store/typingStore.ts` (new file)
- `typingUsersByChatId: Record<string, { userId: string; username: string }[]>`
- `setTypingUsers(chatId, users)` action
- `cleanupStaleTyping()` — periodic cleanup of expired entries

### UI Changes
#### `src/components/chat/ChatView.tsx` or header area
- Show "X is typing..." or "X, Y are typing..." below the chat header
- Only show when typing users exist and are NOT the current user
- Animate in/out

#### `src/components/chat/MessageInput.tsx`
- On text change, debounce 300ms, then call `setTyping(chatId, userId, username)`
- On send (message sent), call `clearTyping(chatId, userId)`
- On input cleared, call `clearTyping(chatId, userId)`
- On unmount, call `clearTyping(chatId, userId)`

### Cleanup
- Typing documents auto-expire (5s TTL). Clients periodically clean up stale entries.
- On app quit, typing docs become orphaned but expire naturally.

---

## 4. Real Online Status

### What
Show green dot (online) / gray dot (offline) next to users in friend list, chat list, and chat header.

### Architecture
Use **Appwrite Realtime** presence. When a user's `users` document is updated (specifically `lastSeenAt` and `isOnline`), other clients get notified via realtime subscription.

### Approach: Heartbeat on `users` document

#### Appwrite Schema Changes
Add to `users` collection:
- `lastSeenAt`: string(64), required — ISO timestamp, updated every 15 seconds while app is open
- `isOnline`: boolean, required — `true` when app is open, set to `false` on `beforeunload`

#### `scripts/setup-appwrite.mjs`
- Add `ensureString(databases, USER_COL, 'lastSeenAt', 64, true)`
- Add `ensureBool(databases, USER_COL, 'isOnline', true)`

### Service Layer
#### `src/services/presence.ts` (new file)
- `startPresenceHeartbeat(userId)` — every 15s, update `lastSeenAt` and `isOnline: true` on user's doc
- `stopPresenceHeartbeat(userId)` — set `isOnline: false`, clear interval
- `subscribeToPresence(callback)` — subscribe to realtime on `users` collection, notify when any user's `isOnline` or `lastSeenAt` changes

### Store Layer
#### `src/store/presenceStore.ts` (new file)
- `onlineUserIds: Set<string>` — track which user IDs are currently online
- `lastSeenByUserId: Record<string, string>` — last seen timestamps
- Actions: `setOnline(userId, online)`, `setLastSeen(userId, timestamp)`

### Integration
#### `src/App.tsx`
- On mount (authenticated): call `startPresenceHeartbeat(userId)`
- On unmount: call `stopPresenceHeartbeat(userId)`
- Subscribe to presence changes

#### `src/components/home/HomeView.tsx` (chat list)
- Show green/gray dot on chat avatars based on member online status
- For DMs: check other member's online status
- For groups: show count of online members

#### `src/components/chat/ChatView.tsx` (header)
- Show "online" / "last seen X" under the chat name

#### `src/components/friends/FriendList.tsx`
- Show online dot on each friend's avatar

---

## 5. Error Toasts

### What
Show non-intrusive toast notifications for errors (send failed, network error, etc.) instead of silently swallowing errors.

### Architecture
A toast system with a Zustand store and a fixed-position toast container.

### New Files
#### `src/store/toastStore.ts`
```ts
interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number // default 4000ms
}
```
- `toasts: Toast[]`
- `addToast(message, type, duration?)` — generates ID, pushes to array
- `removeToast(id)` — removes by ID

#### `src/components/common/ToastContainer.tsx`
- Fixed position bottom-center (or top-right)
- Renders all toasts from store
- Auto-dismiss after `duration`
- Slide-in/slide-out animation
- Glass styling to match theme

#### `src/components/common/Toast.tsx`
- Single toast component with icon (error/success/info), message, close button

### Integration Points
Replace `catch {}` silent blocks throughout the codebase:

| File | Current Behavior | New Behavior |
|------|-----------------|--------------|
| `src/services/friends.ts:57` | Silent catch | `addToast('Failed to load friends', 'error')` |
| `src/services/chats.ts` (various) | Silent catch | `addToast('Failed to ...', 'error')` |
| `src/store/chatStore.ts` sendMessage | Throws (unhandled) | Wrap in try/catch, `addToast('Message failed to send', 'error')` |
| `src/components/chat/MessageInput.tsx:76` | `alert()` | `addToast('Image must be under 5 MB', 'error')` |
| `src/services/auth.ts` | Throws errors | Catch and `addToast(err.message, 'error')` |

### Mount Point
#### `src/App.tsx`
- Render `<ToastContainer />` at the top level (outside `ChatWindow`)

---

## 6. Offline Indicator

### What
Show a banner when the app loses network connectivity.

### Implementation
#### `src/hooks/useOnlineStatus.ts` (new file)
- Listen to `window.addEventListener('online')` / `offline`
- Return `{ isOnline: boolean }`

#### `src/components/common/OfflineBanner.tsx` (new file)
- Fixed bar at top of chat window
- Shows "You're offline — messages will send when reconnected"
- Only visible when `!isOnline`
- Glass styling, red/orange accent

#### Integration
- `src/App.tsx`: Render `<OfflineBanner />` inside `ChatWindow` when `!isOnline`
- `src/store/chatStore.ts` sendMessage: If offline, queue message locally and send on reconnect

---

## 7. Scroll to Bottom FAB

### What
A floating action button that appears when the user scrolls up, allowing them to quickly scroll back to the latest message.

### Changes
#### `src/components/chat/MessageList.tsx`
- Add state: `isNearBottom: boolean` (true when within 120px of bottom, already partially tracked)
- Add state: `showScrollFab: boolean` — true when NOT near bottom AND there are messages below
- Track scroll position in `onScroll` handler
- Render a small round button (bottom-right of message list) when `showScrollFab`
- On click: `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })`
- Button style: glass circle with down-arrow icon, badge showing number of new messages if available

### Existing Code
- `MessageList.tsx:279` already has `nearBottom` logic for auto-scroll
- `bottomRef` already exists
- Just need to expose `showScrollFab` state and render the button

---

## 8. Date Separators

### What
Visual dividers between messages from different days: "Today", "Yesterday", or "Jun 15, 2026".

### Changes
#### `src/utils/dateSeparators.ts` (new file)
- `getDateLabel(sentAt: string): string` — returns "Today", "Yesterday", or formatted date
- `shouldShowDateSeparator(currentMsg: Message, prevMsg: Message | undefined): boolean` — returns true if messages are from different calendar days

#### `src/components/chat/MessageList.tsx`
- Before each `MessageBubble`, check `shouldShowDateSeparator(msg, prevMsg)`
- If true, render a `<DateSeparator label={getDateLabel(msg.sentAt)} />` element

#### `src/components/chat/DateSeparator.tsx` (new component)
- Horizontal line with centered text
- Glass styling: `bg-white/5` line, `text-[10px] text-[#A0A4A8]` text
- "Today" and "Yesterday" labels, otherwise full date

---

## 9. Link Detection

### What
Detect URLs in message text and render them as clickable links that open in the system browser.

### Changes
#### `src/utils/linkify.ts` (new file)
- `parseMessageContent(text: string): Array<{ type: 'text' | 'link'; value: string }>`
- Regex: `https?:\/\/[^\s]+` — match http/https URLs
- Split text into segments of plain text and link segments

#### `src/components/chat/MessageBubble.tsx`
- Instead of rendering `displayContent` as a single `<p>` or `<span>`, parse it with `parseMessageContent()`
- Render link segments as `<a>` tags with `target="_blank" rel="noopener"`
- Links get accent color, underline on hover

#### Electron `openExternal`
- Links clicked in the renderer should open in the system browser, not navigate the Electron window
- Need to add `shell.openExternal` via IPC:
  - `preload.cjs`: add `openExternal: (url) => ipcRenderer.invoke('open-external', url)`
  - `main.cjs`: add `ipcMain.handle('open-external', (_e, url) => shell.openExternal(url))`
  - Validate URL in main process (only allow http/https)

---

## 10. Real-Time Message Sync (Fix Previous Issues)

### Problem
The current 2-second polling interval in `App.tsx:146` (`setInterval(syncActiveChat, 2_000)`) is wasteful and unreliable. The realtime subscription via `subscribeToRealtime()` should handle most updates, but there are edge cases where messages are missed (connection drops, browser sleep, etc.).

### Solution: Hybrid Approach
Keep realtime subscription as primary, add smarter polling as fallback.

### Changes

#### `src/services/realtime.ts`
- Add reconnection logic: if the Appwrite client connection drops, automatically reconnect
- Add connection state tracking: `isConnected` boolean
- Export `getRealtimeConnectionState()` for the offline indicator

#### `src/store/chatStore.ts`
- Remove the 2-second full sync from `App.tsx`
- Instead: on `visibilitychange` (tab becomes visible), do a single sync of the active chat
- On `window focus`, do a single sync
- Keep a longer polling interval (30s) as a safety net for missed realtime events

#### `src/App.tsx`
- Replace `setInterval(syncActiveChat, 2_000)` with:
  - `document.addEventListener('visibilitychange')` — sync on visible
  - `window.addEventListener('focus')` — sync on focus
  - `setInterval(syncActiveChat, 30_000)` — safety net (was 2s, now 30s)

#### `src/store/chatStore.ts` — `loadMessages()`
- Add a `lastSyncAt` timestamp per chat
- On sync, only fetch messages newer than `lastSyncAt` (use cursor-based query)
- This reduces bandwidth and avoids full re-fetches

---

## Implementation Priority

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|--------------|
| 1 | Window model fix (Hyprland) | Large | None — foundational |
| 2 | Error toasts | Small | None |
| 3 | Offline indicator | Small | None |
| 4 | Scroll to bottom FAB | Small | None |
| 5 | Date separators | Small | None |
| 6 | Link detection | Small | None |
| 7 | Message edit | Medium | Schema change (editedAt) |
| 8 | Real-time message sync fix | Medium | None |
| 9 | Real typing indicators | Medium | Schema change (typing collection) |
| 10 | Real online status | Medium | Schema change (lastSeenAt, isOnline on users) |

---

## Appwrite Schema Changes Summary

| Collection | New Attribute | Type | Required |
|------------|--------------|------|----------|
| messages | `editedAt` | string(64) | false |
| users | `lastSeenAt` | string(64) | true |
| users | `isOnline` | boolean | true |
| typing (NEW) | `chatId` | string(36) | true |
| typing (NEW) | `userId` | string(36) | true |
| typing (NEW) | `username` | string(64) | true |
| typing (NEW) | `expiresAt` | string(64) | true |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/store/toastStore.ts` | Toast notification state |
| `src/components/common/ToastContainer.tsx` | Toast container UI |
| `src/components/common/Toast.tsx` | Single toast component |
| `src/hooks/useOnlineStatus.ts` | Network status hook |
| `src/components/common/OfflineBanner.tsx` | Offline banner UI |
| `src/components/chat/DateSeparator.tsx` | Date separator UI |
| `src/utils/dateSeparators.ts` | Date label utilities |
| `src/utils/linkify.ts` | URL detection in text |
| `src/services/typing.ts` | Typing indicator service |
| `src/store/typingStore.ts` | Typing indicator state |
| `src/services/presence.ts` | Online presence service |
| `src/store/presenceStore.ts` | Online presence state |

## Files to Modify

| File | Changes |
|------|---------|
| `electron/main.cjs` | Window model, new IPC handlers, remove mouse passthrough |
| `electron/preload.cjs` | Add setPosition, openExternal, remove setIgnoreMouseEvents |
| `src/App.tsx` | Mount toast container, offline banner, presence heartbeat, fix sync interval |
| `src/types/index.ts` | Add editedAt to Message |
| `src/services/chats.ts` | Add editMessage |
| `src/store/chatStore.ts` | Add editMessage action, fix sync logic |
| `src/components/chat/MessageContextMenu.tsx` | Add Edit menu item |
| `src/components/chat/MessageList.tsx` | Date separators, scroll FAB, pass onEdit |
| `src/components/chat/MessageBubble.tsx` | (edited) indicator, link rendering |
| `src/components/chat/MessageInput.tsx` | Edit mode props, typing broadcast |
| `src/components/chat/ChatView.tsx` | Edit mode, typing indicator display, online status |
| `src/store/uiStore.ts` | Remove getOverlayDimensions, IPC for resize |
| `src/hooks/useOverlayDrag.ts` | Move Electron window instead of HTML element |
| `src/components/overlay/FloatingBubble.tsx` | Adapt to small window model |
| `src/components/overlay/ChatWindow.tsx` | Adapt to small window model |
| `src/services/friends.ts` | Replace silent catches with toasts |
| `scripts/setup-appwrite.mjs` | Add new collections and attributes |

## Files to Delete

| File | Reason |
|------|--------|
| `src/hooks/useMousePassthrough.ts` | No longer needed with small floating window |
