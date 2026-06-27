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

  toggleWindow: () => set((s) => ({ isWindowOpen: !s.isWindowOpen })),

  openWindow: () => set({ isWindowOpen: true }),

  closeWindow: () => set({ isWindowOpen: false }),

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
    set({
      bubblePos: {
        x: window.innerWidth - BUBBLE_SIZE - EDGE_PADDING,
        y: Math.min(100, window.innerHeight - BUBBLE_SIZE - EDGE_PADDING),
      },
      snapSide: 'right',
    })
  },
}))

export const CHAT_WINDOW = { width: 380, height: 340 } as const

export function getOverlayDimensions(isOpen: boolean, _snapSide: SnapSide): {
  width: number
  height: number
} {
  if (!isOpen) {
    return { width: BUBBLE_SIZE + EDGE_PADDING * 2, height: BUBBLE_SIZE + EDGE_PADDING * 2 }
  }
  const chatWidth = CHAT_WINDOW.width
  const chatHeight = CHAT_WINDOW.height + BUBBLE_SIZE + 24
  return {
    width: chatWidth + EDGE_PADDING * 2,
    height: chatHeight + EDGE_PADDING,
  }
}
