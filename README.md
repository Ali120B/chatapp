# Orbix Chat Overlay

Floating glass chat overlay — Electron + React + TypeScript + Tailwind + Zustand + Appwrite.

## Quick Start

```bash
cd App
npm install
npm run dev          # Electron overlay
npm run dev:web      # Browser-only dev server
```

## Features

### Chat
- **DMs, groups, temp groups** — private chats, persistent groups, auto-expiring temp groups
- **Message edit** — edit your own messages, "(edited)" badge shown
- **Message reactions** — emoji reactions on any message
- **Polls** — create polls in chats, vote, add options
- **Message forwarding** — single or bulk forward to any chat
- **Message delete** — delete for yourself or everyone
- **Reply to messages** — quoted reply previews
- **Copy messages** — right-click copy (text + images)
- **Link detection** — URLs in messages are clickable, open in system browser
- **Image paste** — Ctrl+V to paste screenshots directly into chat
- **Read receipts** — single grey tick (sent) / double blue ticks (read) like WhatsApp

### UI
- **Floating bubble** — draggable, snaps to edges, persists position across restarts
- **Glassmorphism UI** — frosted glass panels, bubbles, menus
- **Date separators** — "Today" / "Yesterday" / date dividers between message groups
- **Scroll to bottom FAB** — down-arrow button when scrolled up
- **7 accent colors** — customizable in Settings
- **Animations** — view transitions, message pop-in, menu scale, nav pill slide

### Real-time
- **1.5s polling** — messages, typing indicators, and read receipts update every 1.5 seconds
- **Typing indicators** — "X is typing..." shown below chat header
- **Chat list sorting** — newest chats always on top

### Social
- **Friends system** — search, add, accept/reject requests
- **Online presence** — green dot on avatars for online users
- **Profile photos** — upload avatars in Settings

### Security
- **End-to-end encryption** — encrypted messages with key hint
- **Profanity filter** — automatic word filtering
- **Auth** — email/password signup and login

### System
- **Always-on-top** — overlay stays above other windows
- **Global hotkey** — Alt+Shift+Space to focus the overlay
- **System tray** — tray icon on Windows
- **Auto-updater** — updates automatically on Windows
- **Offline indicator** — banner when network drops
- **Error toasts** — non-intrusive notifications for errors

## Architecture

| Layer | Tech |
|-------|------|
| Desktop | Electron (frameless, transparent, always-on-top) |
| Frontend | React 19 + TypeScript + Tailwind CSS |
| State | Zustand |
| Backend | Appwrite (auth, database, storage, realtime) |
| Build | Vite |

## Appwrite Setup

Run the automated setup:

```bash
cp .env.setup.example .env.setup   # fill in your Appwrite credentials
npm run setup:appwrite
```

This creates the database, collections, and storage bucket automatically.

### Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles, avatars, online status |
| `friendships` | Friend requests and blocks |
| `chats` | DMs, groups, temp groups |
| `messages` | Text, images, polls, reactions, read receipts |
| `typing` | Ephemeral typing indicators (auto-expires) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server + Electron overlay |
| `npm run dev:web` | Browser-only development |
| `npm run build` | Production build |
| `npm run publish` | Build + package + publish releases |
| `npm run setup:appwrite` | Provision Appwrite schema |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus message input |
| `Escape` | Close chat window |
| `Alt+Shift+Space` | Focus overlay (global) |
| `Enter` | Send message |
| `Ctrl+V` | Paste image from clipboard |

## Troubleshooting

### Overlay steals focus on KDE/Hyprland

The window is focusable by default. Click a text field inside the chat to type.

### Images not loading

The app uses `getFileView` (raw file) instead of `getFilePreview` (requires paid plan). If images still don't load, check your Appwrite storage bucket permissions.

### `__dirname is not defined`

If `ELECTRON_RUN_AS_NODE=1` is set, Electron runs as plain Node. Run:

```bash
env -u ELECTRON_RUN_AS_NODE electron . --no-sandbox
```
