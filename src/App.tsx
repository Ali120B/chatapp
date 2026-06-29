import { useEffect } from 'react'
import { FloatingBubble } from '@/components/overlay/FloatingBubble'
import { ChatWindow } from '@/components/overlay/ChatWindow'
import { AuthView } from '@/components/auth/AuthView'
import { HomeView } from '@/components/home/HomeView'
import { ChatView } from '@/components/chat/ChatView'
import { GroupDetailsView } from '@/components/chat/GroupDetailsView'
import { ForwardView } from '@/components/chat/ForwardView'
import { FriendsView } from '@/components/friends/FriendsView'
import { SettingsView } from '@/components/settings/SettingsView'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useUiStore } from '@/store/uiStore'
import { useThemeStore } from '@/store/themeStore'
import { useElectronResize } from '@/hooks/useElectronResize'
import { useMousePassthrough } from '@/hooks/useMousePassthrough'
import { subscribeToRealtime } from '@/services/realtime'

function AuthenticatedContent() {
  const activeView = useUiStore((s) => s.activeView)

  switch (activeView) {
    case 'chat':
      return <ChatView key="chat" />
    case 'groupDetails':
      return <GroupDetailsView key="groupDetails" />
    case 'forward':
      return <ForwardView key="forward" />
    case 'friends':
      return <FriendsView key="friends" />
    case 'settings':
      return <SettingsView key="settings" />
    default:
      return <HomeView key="home" />
  }
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const isWindowOpen = useUiStore((s) => s.isWindowOpen)
  const activeView = useUiStore((s) => s.activeView)
  const initBubblePosition = useUiStore((s) => s.initBubblePosition)
  const totalUnread = useChatStore((s) =>
    Object.values(s.unreadCounts).reduce((a, b) => a + b, 0),
  )
  const addIncomingMessage = useChatStore((s) => s.addIncomingMessage)
  const loadChats = useChatStore((s) => s.loadChats)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const purgeExpiredTempChats = useChatStore((s) => s.purgeExpiredTempChats)
  const initTheme = useThemeStore((s) => s.initTheme)

  useElectronResize(isWindowOpen)
  useMousePassthrough()

  useEffect(() => {
    if (!window.electronAPI?.keepOnTop) return
    const tick = () => window.electronAPI?.keepOnTop?.()
    tick()
    const interval = setInterval(tick, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as Element)?.closest('[data-needs-focus]')) {
        window.electronAPI?.setFocusable?.(true)
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as Element)?.closest('[data-needs-focus]')) {
        window.electronAPI?.setFocusable?.(true)
      }
    }
    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as Element | null
      if (!related?.closest('[data-needs-focus]')) {
        window.electronAPI?.setFocusable?.(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
    }
  }, [])

  useEffect(() => {
    initTheme()
    initBubblePosition()
    void restoreSession()
  }, [initTheme, initBubblePosition, restoreSession])

  useEffect(() => {
    const onResize = () => initBubblePosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [initBubblePosition])

  useEffect(() => {
    if (!isAuthenticated) return
    void loadChats()
    const interval = setInterval(() => void purgeExpiredTempChats(), 60_000)
    return () => clearInterval(interval)
  }, [isAuthenticated, loadChats, purgeExpiredTempChats])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const handleIncoming = (message: Parameters<typeof addIncomingMessage>[0]) => {
      const known = useChatStore.getState().chats.some((c) => c.$id === message.chatId)
      if (known) {
        addIncomingMessage(message)
        return
      }
      void loadChats().then(() => {
        if (useChatStore.getState().chats.some((c) => c.$id === message.chatId)) {
          addIncomingMessage(message)
        }
      })
    }

    return subscribeToRealtime(
      user.userId,
      (chatId) => useChatStore.getState().chats.some((c) => c.$id === chatId),
      handleIncoming,
      useChatStore.getState().applyMessageUpdate,
      useChatStore.getState().removeMessage,
      useChatStore.getState().applyChatUpdate,
    )
  }, [isAuthenticated, user, addIncomingMessage, loadChats])

  useEffect(() => {
    if (!isAuthenticated) return

    const syncActiveChat = () => {
      const { activeChatId } = useChatStore.getState()
      void loadChats()
      if (activeChatId) void loadMessages(activeChatId)
    }

    const interval = setInterval(syncActiveChat, 3_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncActiveChat()
    }
    window.addEventListener('focus', syncActiveChat)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', syncActiveChat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, loadChats, loadMessages])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && isWindowOpen && isAuthenticated) {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('[aria-label="Message input"]')
        input?.focus()
      }
      if (e.key === 'Escape' && isWindowOpen) {
        useUiStore.getState().closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWindowOpen, isAuthenticated])

  return (
    <>
      <FloatingBubble unreadCount={totalUnread} />
      <ChatWindow>
        <div key={activeView} className="h-full">
          {isAuthenticated ? <AuthenticatedContent /> : <AuthView />}
        </div>
      </ChatWindow>
    </>
  )
}
