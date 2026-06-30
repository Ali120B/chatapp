export interface MessageSegment {
  type: 'text' | 'link'
  value: string
}

const URL_REGEX = /(?:https?:\/\/[^\s)]+|(?:www\.)[^\s)]+)/g

export function parseMessageContent(text: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index!
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) })
    }
    segments.push({ type: 'link', value: match[0] })
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}
