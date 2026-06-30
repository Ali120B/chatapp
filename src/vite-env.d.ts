/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string
  readonly VITE_APPWRITE_PROJECT_ID: string
  readonly VITE_APPWRITE_DATABASE_ID: string
  readonly VITE_APPWRITE_USERS_COLLECTION: string
  readonly VITE_APPWRITE_FRIENDSHIPS_COLLECTION: string
  readonly VITE_APPWRITE_CHATS_COLLECTION: string
  readonly VITE_APPWRITE_MESSAGES_COLLECTION: string
  readonly VITE_APPWRITE_STORAGE_BUCKET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ElectronAPI {
  setIgnoreMouseEvents?: (ignore: boolean, options?: { forward: boolean }) => void
  setFocusable?: (focusable: boolean) => void
  keepOnTop?: () => void
  setPosition?: (x: number, y: number) => void
  getPosition?: () => Promise<[number, number]>
  resizeOverlay?: (width: number, height: number) => void
  openExternal?: (url: string) => void
  onDeepLink?: (callback: (payload: { type: string; userId: string | null; secret: string | null }) => void) => () => void
  onGlobalFocusShortcut?: (callback: () => void) => () => void
  platform: NodeJS.Platform
}

interface Window {
  electronAPI?: ElectronAPI
}
