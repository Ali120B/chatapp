import type { FriendshipRelation } from '@/types'
import type { UserSearchResult } from '@/services/friends'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { Avatar } from '@/components/common/Avatar'

interface FriendSearchProps {
  query: string
  onQueryChange: (q: string) => void
  results: UserSearchResult[]
  onSendRequest: (userId: string) => void
  requestError: string | null
}

function statusLabel(status: FriendshipRelation): string | null {
  switch (status) {
    case 'friends':
      return 'Friends'
    case 'pending_sent':
      return 'Sent'
    case 'pending_received':
      return 'Wants to add you'
    case 'blocked':
      return 'Blocked'
    default:
      return null
  }
}

export function FriendSearch({
  query,
  onQueryChange,
  results,
  onSendRequest,
  requestError,
}: FriendSearchProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3">
      <GlassPanel variant="pill" className="mb-3 px-3 py-2">
        <input
          type="search"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
          aria-label="Search users by username"
          data-needs-focus
        />
      </GlassPanel>

      {requestError && (
        <p className="mb-2 text-center text-xs text-[#E53E3E]" role="alert">
          {requestError}
        </p>
      )}

      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto" role="list">
        {results.map((user) => {
          const label = statusLabel(user.friendshipStatus)
          const canSend = user.friendshipStatus === 'none'

          return (
            <li key={user.userId}>
              <div className="glass-chip mb-1.5 flex items-center gap-2.5 px-2.5 py-2">
                <Avatar src={user.avatarUrl} name={user.username} size="sm" />
                <span className="flex-1 text-sm text-white">{user.username}</span>
                {label ? (
                  <span
                    className={`text-xs ${
                      user.friendshipStatus === 'friends'
                        ? 'text-[#38A169]'
                        : user.friendshipStatus === 'pending_sent'
                          ? 'text-[#A0A4A8]'
                          : 'text-[#00B4FF]'
                    }`}
                  >
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendRequest(user.userId)}
                    disabled={!canSend}
                    className="rounded-full bg-[#00B4FF]/20 px-3 py-1 text-xs text-[#00B4FF] hover:bg-[#00B4FF]/30 disabled:opacity-40"
                  >
                    Add
                  </button>
                )}
              </div>
            </li>
          )
        })}
        {query.trim() && results.length === 0 && (
          <p className="py-4 text-center text-xs text-[#A0A4A8]">No users found</p>
        )}
      </ul>
    </div>
  )
}
