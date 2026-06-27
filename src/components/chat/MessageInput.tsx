import { useRef, useState } from 'react'
import { FloatingMenu } from '@/components/common/FloatingMenu'
import { EmojiPickerPopup } from '@/components/common/EmojiPickerPopup'

interface MessageInputProps {
  onSend: (content: string, imageFile?: File) => Promise<void>
  onCreatePoll?: () => void
  disabled?: boolean
  replyPreview?: { senderName: string; content: string } | null
  onClearReply?: () => void
}

export function MessageInput({
  onSend,
  onCreatePoll,
  disabled,
  replyPreview,
  onClearReply,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [justSent, setJustSent] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLButtonElement>(null)

  const focusInput = () => {
    window.electronAPI?.setFocusable?.(true)
    inputRef.current?.focus()
  }

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current
    if (!input) {
      setText((prev) => prev + emoji)
      return
    }
    const start = input.selectionStart ?? text.length
    const end = input.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    const caret = start + emoji.length
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(caret, caret)
    })
  }

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onSend(text)
      setText('')
      onClearReply?.()
      setJustSent(true)
      setTimeout(() => setJustSent(false), 400)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB')
      return
    }
    setSending(true)
    try {
      await onSend(text || '📷 Image', file)
      setText('')
      onClearReply?.()
    } finally {
      setSending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const isTyping = text.length > 0

  return (
    <div className="shrink-0 px-3 pb-3 pt-1">
      {replyPreview && (
        <div className="animate-slide-down mb-2 flex items-center gap-2 rounded-xl bg-white/6 px-2 py-1.5">
          <div className="min-w-0 flex-1 border-l-2 border-[var(--color-accent)] pl-2">
            <p className="text-[10px] font-medium text-[var(--color-accent)]">
              Replying to {replyPreview.senderName}
            </p>
            <p className="truncate text-xs text-[#A0A4A8]">{replyPreview.content}</p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="text-[#A0A4A8] hover:text-white"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}
      {isTyping && (
        <div className="mb-1 flex items-center gap-1 px-1" aria-hidden="true">
          <span className="text-[10px] text-[#A0A4A8]">typing</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]"
              style={{ animation: `typingDots 1.2s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      )}
      <div
        className={`flex items-center gap-2 transition-transform duration-200 ${justSent ? 'scale-[0.98]' : ''}`}
      >
        <button
          ref={attachRef}
          type="button"
          onClick={() => {
            setShowEmojiPicker(false)
            setShowAttachMenu((v) => !v)
          }}
          className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center text-[#A0A4A8] transition-colors duration-200 hover:text-white"
          aria-label="Attach"
          aria-expanded={showAttachMenu || showEmojiPicker}
          disabled={disabled || sending}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {showAttachMenu && (
          <FloatingMenu
            anchorRef={attachRef}
            onClose={() => setShowAttachMenu(false)}
            items={[
              {
                label: 'Emoji',
                icon: <span className="text-sm">😊</span>,
                onClick: () => setShowEmojiPicker(true),
              },
              {
                label: 'Photo',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                ),
                onClick: () => fileRef.current?.click(),
              },
              {
                label: 'Poll',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                onClick: () => onCreatePoll?.(),
              },
            ]}
          />
        )}

        {showEmojiPicker && (
          <EmojiPickerPopup
            anchorRef={attachRef}
            onSelect={insertEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        <div
          className="glass-chip glass-chip-input min-w-0 flex-1 px-3 py-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPointerDown={focusInput}
            onClick={focusInput}
            placeholder={replyPreview ? 'Reply...' : 'Type a message...'}
            className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
            aria-label="Message input"
            data-needs-focus
            disabled={disabled || sending}
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending || disabled}
          className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-accent)] transition-all duration-200 hover:scale-105 disabled:opacity-40"
          aria-label="Send message"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
