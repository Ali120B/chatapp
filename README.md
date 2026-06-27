# Chat Overlay

Roblox-style liquid glass floating chat overlay — Vite + React + TypeScript + Tailwind + Zustand + Appwrite + Electron.

## Quick Start

```bash
cd App
npm install
npm run dev          # Vite + Electron (always-on-top overlay)
npm run dev:web      # Browser-only dev server
```

Click **Enter Test Mode** on the login screen to explore the full UI without Appwrite credentials.

## Features

- **Free-position draggable bubble** — place anywhere on screen (no forced edge snap)
- **Chat window** — 380×340 liquid glass panel centered above bubble
- **Always-on-top overlay** — full-screen transparent Electron window with click-through (KDE/Linux friendly)
- **Floating menus** — Home/Chat ⋮ menus, message right-click context menu with reactions
- **Group details** — info + members tabs (WhatsApp-style layout)
- **Color themes** — 7 accent colors in Settings
- **Animations** — view transitions, message pop-in, menu scale, nav pill slide
- Auth, Test Mode, DMs, temp groups, friends, encryption, profanity filter

## Appwrite Setup

1. Copy `.env.example` to `.env` and fill in your project values.
2. Create database `chatapp` with collections: `users`, `friendships`, `chats`, `messages`.
3. Create storage bucket `chat-images` (5 MB max file size enforced client-side).
4. Set collection permissions so only authenticated members can read/write.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server + Electron overlay |
| `npm run dev:web` | Browser-only development |
| `npm run build` | Production web + electron bundles |
| `npm run build:electron` | Build + package for Mac/Win/Linux |

## Troubleshooting

### `__dirname is not defined` or `app` / `app.isPackaged` is undefined

If `ELECTRON_RUN_AS_NODE=1` is set in your environment (some IDE terminals do this), Electron runs as plain Node and API imports fail.

`npm run dev` unsets this automatically. Manual launch:

```bash
env -u ELECTRON_RUN_AS_NODE electron . --no-sandbox
```

### Overlay steals focus on KDE

The window is **non-focusable** by default so other apps stay interactive. Click a text field inside the chat to type — focus is enabled only for inputs marked `data-needs-focus`.

### Context menu appears in wrong place

Message menus are portaled to the document body and anchored to the message bubble. If issues persist, restart dev after pulling latest changes.

## Task tracking

| File | Purpose |
|------|---------|
| `App/task.md` | Full implementation handoff |
| `../implementation_plan.md` | Feature plan + completion table |
| `../current_task.md` / `../new_task.md` | Checklist with tick status |

## Still in progress

- Message reactions (UI only)
- Forward / Pin / Info menu actions (stubs)
- Image rendering in message bubbles
- Live Appwrite end-to-end testing
