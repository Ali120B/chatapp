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
  const next: MessageReactions = {}
  // Copy existing reactions, removing this user from ALL emojis first
  for (const [e, users] of Object.entries(reactions)) {
    const filtered = users.filter((u) => u !== userId)
    if (filtered.length > 0) next[e] = filtered
  }
  // If user already reacted with this emoji, remove it (toggle off)
  const existing = next[emoji] ?? []
  if (existing.includes(userId)) {
    const filtered = existing.filter((u) => u !== userId)
    if (filtered.length > 0) next[emoji] = filtered
    else delete next[emoji]
  } else {
    // Add this reaction
    next[emoji] = [...existing, userId]
  }
  return next
}
