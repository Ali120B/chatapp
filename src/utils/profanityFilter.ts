import { Filter } from 'bad-words'
import type { SanitizeResult } from '@/types'

const filter = new Filter()

export function sanitizeMessage(text: string): SanitizeResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { sanitized: '', filteredCount: 0 }
  }

  const originalWords = trimmed.split(/\s+/)
  const sanitized = filter.clean(trimmed)
  const sanitizedWords = sanitized.split(/\s+/)

  let filteredCount = 0
  for (let i = 0; i < originalWords.length; i++) {
    if (originalWords[i] !== sanitizedWords[i]) {
      filteredCount++
    }
  }

  return { sanitized, filteredCount }
}

export function isClean(text: string): boolean {
  return !filter.isProfane(text)
}
