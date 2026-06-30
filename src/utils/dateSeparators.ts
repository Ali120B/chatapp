import type { Message } from '@/types'

function toDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function shouldShowDateSeparator(currentMsg: Message, prevMsg: Message | undefined): boolean {
  if (!prevMsg) return true
  return toDateKey(currentMsg.sentAt) !== toDateKey(prevMsg.sentAt)
}

export function getDateLabel(sentAt: string): string {
  const now = new Date()
  const date = new Date(sentAt)

  const nowKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

  if (dateKey === nowKey) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`
  if (dateKey === yesterdayKey) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
