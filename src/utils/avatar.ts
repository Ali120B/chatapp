/** No random avatars — empty until user uploads one in Settings (future). */
export const EMPTY_AVATAR = ''

export function avatarInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}
