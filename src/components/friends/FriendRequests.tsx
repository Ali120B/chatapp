import type { Friendship, UserProfile } from '@/types'
import { Avatar } from '@/components/common/Avatar'

interface FriendRequestsProps {
  requests: Array<Friendship & { fromUser?: UserProfile }>
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export function FriendRequests({ requests, onAccept, onReject }: FriendRequestsProps) {
  if (requests.length === 0) return null

  return (
    <div className="px-3 pb-2">
      <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[#A0A4A8]">
        <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
        Pending requests ({requests.length})
      </p>
      {requests.map((req) => (
        <div
          key={req.$id}
          className="glass-chip mb-1.5 flex items-center gap-2 px-2.5 py-2"
        >
          <Avatar
            src={req.fromUser?.avatarUrl}
            name={req.fromUser?.username ?? 'User'}
            size="sm"
          />
          <span className="flex-1 text-sm text-white">
            {req.fromUser?.username ?? 'Unknown'}
          </span>
          <button
            type="button"
            onClick={() => onAccept(req.$id)}
            className="rounded-full bg-[#38A169]/20 px-2.5 py-1 text-xs text-[#38A169]"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onReject(req.$id)}
            className="rounded-full bg-[#E53E3E]/20 px-2.5 py-1 text-xs text-[#E53E3E]"
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  )
}
