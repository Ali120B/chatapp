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
import { ToastContainer } from '@/components/common/ToastContainer'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useUiStore } from '@/store/uiStore'
import { useThemeStore } from '@/store/themeStore'
import { useTypingStore } from '@/store/typingStore'
import { useFriendsStore } from '@/store/friendsStore'
import { useElectronResize } from '@/hooks/useElectronResize'
import { useMousePassthrough } from '@/hooks/useMousePassthrough'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { subscribeToRealtime } from '@/services/realtime'
import { presenceService } from '@/services/presence'
import { typingService } from '@/services/typing'
import { client, APPWRITE_CONFIG, databases, Query } from '@/services/appwrite'

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
  const { isOnline } = useOnlineStatus()
  const addTypingUser = useTypingStore((s) => s.addTypingUser)
  const removeTypingUser = useTypingStore((s) => s.removeTypingUser)

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

  // 5s friends polling — requests and friend list
  useEffect(() => {
    if (!isAuthenticated) return
    const loadFriends = useFriendsStore.getState().loadFriends
    void loadFriends()
    const interval = setInterval(() => void loadFriends(), 5_000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Presence heartbeat
  useEffect(() => {
    if (!isAuthenticated || !user) return
    void presenceService.startPresenceHeartbeat(user.userId)
    return () => {
      void presenceService.stopPresenceHeartbeat(user.userId)
    }
  }, [isAuthenticated, user])

  // Typing indicators realtime subscription
  useEffect(() => {
    if (!isAuthenticated) return
    const dbId = APPWRITE_CONFIG.databaseId

    const unsubscribe = client.subscribe(
      `databases.${dbId}.collections.typing.documents`,
      (response) => {
        const payload = response.payload as Record<string, unknown>
        const events = response.events
        const chatId = payload.chatId as string
        const userId = payload.userId as string
        const username = payload.username as string
        const expiresAt = payload.expiresAt as string

        if (!chatId || !userId) return

        if (events.some((e) => e.includes('.delete'))) {
          removeTypingUser(chatId, userId)
          return
        }

        if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
          removeTypingUser(chatId, userId)
          return
        }

        addTypingUser(chatId, { userId, username })
      },
    )

    return () => {
      unsubscribe()
    }
  }, [isAuthenticated, addTypingUser, removeTypingUser])

  // Clean up expired typing entries periodically
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => {
      const { typingUsersByChatId } = useTypingStore.getState()
      for (const [chatId, users] of Object.entries(typingUsersByChatId)) {
        for (const u of users) {
          // Only clear our own stale entries — remote entries are managed by their owners
          if (u.userId === user?.userId) {
            void typingService.clearTyping(chatId, u.userId).then(() => {
              removeTypingUser(chatId, u.userId)
            })
          }
        }
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.userId, removeTypingUser])

  // 1.5s typing poll — fetches fresh typing state from DB
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const pollTyping = async () => {
      const { activeChatId } = useChatStore.getState()
      if (!activeChatId) return
      try {
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          'typing',
          [Query.equal('chatId', activeChatId), Query.limit(20)],
        )
        const now = Date.now()
        const activeUserIds = new Set<string>()
        for (const doc of res.documents) {
          const expiresAt = doc.expiresAt as string
          const uid = doc.userId as string
          const uname = doc.username as string
          if (uid === user.userId) continue
          if (new Date(expiresAt).getTime() < now) {
            removeTypingUser(activeChatId, uid)
          } else {
            addTypingUser(activeChatId, { userId: uid, username: uname })
            activeUserIds.add(uid)
          }
        }
        // Clean up local typing users no longer in DB (they stopped typing)
        const localTyping = useTypingStore.getState().typingUsersByChatId[activeChatId] ?? []
        for (const u of localTyping) {
          if (u.userId !== user.userId && !activeUserIds.has(u.userId)) {
            removeTypingUser(activeChatId, u.userId)
          }
        }
      } catch {
        // typing collection may not exist
      }
    }
    const interval = setInterval(pollTyping, 1_500)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.userId, addTypingUser, removeTypingUser])

  // 1.5s read receipt poll — refreshes readBy status for active chat messages
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const pollReadReceipts = async () => {
      const { activeChatId, messagesByChatId } = useChatStore.getState()
      if (!activeChatId) return
      const messages = messagesByChatId[activeChatId] ?? []
      if (messages.length === 0) return
      try {
        // Fetch latest versions of messages to get updated readBy arrays
        const msgIds = messages.slice(-20).map((m) => m.$id)
        const updated = await Promise.all(
          msgIds.map(async (id) => {
            try {
              const doc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.messages,
                id,
              )
              return { id, readBy: (doc.readBy as string[] | undefined) ?? [] }
            } catch {
              return null
            }
          }),
        )
        for (const u of updated) {
          if (!u) continue
          const msg = messages.find((m) => m.$id === u.id)
          if (!msg) continue
          const existing = msg.readBy ?? []
          const newReaders = u.readBy.filter((r) => !existing.includes(r))
          if (newReaders.length > 0) {
            useChatStore.getState().applyMessageUpdate({
              ...msg,
              readBy: [...existing, ...newReaders],
            })
          }
        }
      } catch {
        // degrade
      }
    }
    const interval = setInterval(pollReadReceipts, 1_500)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.userId])

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

  // Sync: 1.5s polling for messages + typing (realtime is too slow)
  useEffect(() => {
    if (!isAuthenticated) return

    const syncActiveChat = () => {
      const { activeChatId } = useChatStore.getState()
      void loadChats()
      if (activeChatId) void loadMessages(activeChatId)
    }

    const interval = setInterval(syncActiveChat, 1_500)
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
    const focusMessageInput = () => {
      window.electronAPI?.setFocusable?.(true)
      window.setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[aria-label="Message input"]')
        input?.focus()
      }, 0)
    }

    const focusAppOrInput = () => {
      useUiStore.getState().openWindow()
      if (useUiStore.getState().activeView === 'chat' && useChatStore.getState().activeChatId) {
        focusMessageInput()
      } else {
        window.electronAPI?.setFocusable?.(true)
      }
    }

    const unsubscribeGlobalFocus = window.electronAPI?.onGlobalFocusShortcut?.(focusAppOrInput)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && isWindowOpen && isAuthenticated) {
        const input = document.querySelector<HTMLInputElement>('[aria-label="Message input"]')
        if (document.activeElement !== input) {
          e.preventDefault()
          focusMessageInput()
        }
      }
      if (e.key === 'Escape' && isWindowOpen) {
        useUiStore.getState().closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unsubscribeGlobalFocus?.()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isWindowOpen, isAuthenticated])

  return (
    <>
      <FloatingBubble unreadCount={totalUnread} />
      <ChatWindow>
        {!isOnline && <OfflineBanner />}
        <div key={activeView} className="flex h-full flex-col">
          {isAuthenticated ? <AuthenticatedContent /> : <AuthView />}
        </div>
      </ChatWindow>
      <ToastContainer />
    </>
  )
}
