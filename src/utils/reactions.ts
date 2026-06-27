export type MessageReactions = Record<string, string[]>

export function parseReactions(raw: string | null | undefined): MessageReactions {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as MessageReactions
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function serializeReactions(reactions: MessageReactions): string {
  return JSON.stringify(reactions)
}

export function toggleReaction(
  reactions: MessageReactions,
  emoji: string,
  userId: string,
): MessageReactions {
  const next = { ...reactions }
  const users = [...(next[emoji] ?? [])]
  const idx = users.indexOf(userId)
  if (idx >= 0) {
    users.splice(idx, 1)
    if (users.length === 0) delete next[emoji]
    else next[emoji] = users
  } else {
    next[emoji] = [...users, userId]
  }
  return next
}
