import { create } from 'zustand'
import type { AppView, NavTab, Position, SnapSide } from '@/types'

const BUBBLE_SIZE = 48
const EDGE_PADDING = 16

export interface ForwardPayload {
  sourceChatId: string
  messageIds: string[]
  returnView: AppView
}

interface UiState {
  isWindowOpen: boolean
  activeView: AppView
  activeTab: NavTab
  bubblePos: Position
  snapSide: SnapSide
  isDragging: boolean
  forwardPayload: ForwardPayload | null
  toggleWindow: () => void
  openWindow: () => void
  closeWindow: () => void
  setView: (view: AppView) => void
  setTab: (tab: NavTab) => void
  setBubblePos: (pos: Position) => void
  setSnapSide: (side: SnapSide) => void
  setDragging: (dragging: boolean) => void
  startForward: (sourceChatId: string, messageIds: string[], returnView?: AppView) => void
  clearForward: () => void
  snapBubble: (currentX: number) => Position
  initBubblePosition: () => void
}

export const BUBBLE_DIMENSIONS = { size: BUBBLE_SIZE, padding: EDGE_PADDING }

export const useUiStore = create<UiState>((set, get) => ({
  isWindowOpen: false,
  activeView: 'home',
  activeTab: 'chats',
  bubblePos: { x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING, y: 100 },
  snapSide: 'right',
  isDragging: false,
  forwardPayload: null,

  toggleWindow: () => {
    const next = !get().isWindowOpen
    set({ isWindowOpen: next })
    if (next) {
      window.electronAPI?.resizeOverlay?.(380, 340 + BUBBLE_SIZE + 24)
    } else {
      window.electronAPI?.resizeOverlay?.(200, 200)
    }
  },

  openWindow: () => {
    set({ isWindowOpen: true })
    window.electronAPI?.resizeOverlay?.(380, 340 + BUBBLE_SIZE + 24)
  },

  closeWindow: () => {
    set({ isWindowOpen: false })
    window.electronAPI?.resizeOverlay?.(200, 200)
  },

  setView: (view) => {
    const tabMap: Record<AppView, NavTab | null> = {
      home: 'chats',
      friends: 'friends',
      settings: 'settings',
      chat: null,
      groupDetails: null,
      forward: null,
    }
    const tab = tabMap[view]
    set({ activeView: view, ...(tab ? { activeTab: tab } : {}) })
  },

  setTab: (tab) => {
    const viewMap: Record<NavTab, AppView> = {
      chats: 'home',
      friends: 'friends',
      settings: 'settings',
    }
    set({ activeTab: tab, activeView: viewMap[tab] })
  },

  setBubblePos: (pos) => set({ bubblePos: pos }),

  setSnapSide: (side) => set({ snapSide: side }),

  setDragging: (dragging) => set({ isDragging: dragging }),

  startForward: (sourceChatId, messageIds, returnView = 'chat') => {
    set({
      forwardPayload: { sourceChatId, messageIds, returnView },
      activeView: 'forward',
    })
  },

  clearForward: () => set({ forwardPayload: null }),

  snapBubble: (currentX) => {
    const centerX = currentX + BUBBLE_SIZE / 2
    const side: SnapSide = centerX < window.innerWidth / 2 ? 'left' : 'right'
    const x =
      side === 'left'
        ? EDGE_PADDING
        : window.innerWidth - BUBBLE_SIZE - EDGE_PADDING
    const { bubblePos } = get()
    set({ snapSide: side, bubblePos: { x, y: bubblePos.y } })
    return { x, y: bubblePos.y }
  },

  initBubblePosition: () => {
    const stored = localStorage.getItem('bubblePos')
    let pos: Position
    if (stored) {
      try {
        pos = JSON.parse(stored)
      } catch {
        pos = { x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING, y: 100 }
      }
    } else {
      pos = { x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING, y: 100 }
    }
    set({ bubblePos: pos, snapSide: pos.x < window.innerWidth / 2 ? 'left' : 'right' })
    window.electronAPI?.setPosition?.(pos.x, pos.y)
  },
}))

export const CHAT_WINDOW = { width: 380, height: 340 } as const
