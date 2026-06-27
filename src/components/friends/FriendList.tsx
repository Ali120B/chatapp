import type { UserProfile } from '@/types'
import { Avatar } from '@/components/common/Avatar'

interface FriendListProps {
  friends: UserProfile[]
  onlineStatus: Record<string, boolean>
  onMessage: (friend: UserProfile) => void
  onRemove: (friend: UserProfile) => void
}

export function FriendList({ friends, onlineStatus, onMessage, onRemove }: FriendListProps) {
  if (friends.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-[#A0A4A8]">
        No friends yet — search to add some!
      </div>
    )
  }

  return (
    <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3" role="list">
      {friends.map((friend) => {
        const online = onlineStatus[friend.userId] ?? false
        return (
          <li key={friend.userId}>
            <div className="glass-chip mb-1.5 flex items-center gap-2.5 px-2.5 py-2">
              <button
                type="button"
                onClick={() => onMessage(friend)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left hover:opacity-90"
              >
                <div className="relative">
                  <Avatar src={friend.avatarUrl} name={friend.username} size="md" />
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#191b1d]
                      ${online ? 'bg-[#38A169]' : 'bg-[#A0A4A8]'}`}
                    aria-label={online ? 'Online' : 'Offline'}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{friend.username}</span>
                  <p className="text-[10px] text-[#A0A4A8]">{online ? 'Online' : 'Offline'}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onRemove(friend)}
                className="shrink-0 rounded-full px-2 py-1 text-[10px] text-[#E53E3E] hover:bg-[#E53E3E]/10"
                aria-label={`Remove ${friend.username}`}
              >
                Remove
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
