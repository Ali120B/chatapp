/** Temp groups delete 1 hour after the last message (or creation if no messages yet). */
export const TEMP_GROUP_TTL_MS = 60 * 60 * 1000

export function tempGroupExpiresAt(from = Date.now()): string {
  return new Date(from + TEMP_GROUP_TTL_MS).toISOString()
}

export function isTempGroupExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return Date.now() >= new Date(expiresAt).getTime()
}
