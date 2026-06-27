import type { Chat } from '@/types'
import type { ChatContextMenuItem } from '@/components/chat/ChatContextMenu'

interface ChatContextActions {
  clearChat: (chatId: string) => void | Promise<void>
  deleteChat: (chatId: string) => void | Promise<void>
  leaveChat: (chatId: string) => void | Promise<void>
  onAfterDelete?: () => void
  onAfterLeave?: () => void
}

export function buildChatContextMenuItems(
  chat: Chat,
  actions: ChatContextActions,
): ChatContextMenuItem[] {
  const isGroup = chat.type === 'group_temp' || chat.type === 'group_persist'

  return [
    {
      label: 'Clear chat',
      onClick: () => {
        void actions.clearChat(chat.$id)
      },
    },
    {
      label: 'Delete chat',
      danger: true,
      onClick: () => {
        void actions.deleteChat(chat.$id)
        actions.onAfterDelete?.()
      },
    },
    ...(isGroup
      ? [
          {
            label: 'Leave group',
            danger: true,
            onClick: () => {
              void actions.leaveChat(chat.$id)
              actions.onAfterLeave?.()
            },
          },
        ]
      : []),
  ]
}
