import { useEffect, useRef, useState } from 'react'
import type { Message } from '@/types'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { Avatar } from '@/components/common/Avatar'
import { MessageContextMenu, type AnchorRect } from './MessageContextMenu'
import { PollMessage } from './PollMessage'

interface ReplyQuoteProps {
  senderName: string
  content: string
  isSelf: boolean
}

function ReplyQuote({ senderName, content, isSelf }: ReplyQuoteProps) {
  return (
    <div
      className={`mb-1.5 rounded-lg border-l-2 bg-black/20 px-2 py-1 ${
        isSelf ? 'border-[var(--color-accent)]' : 'border-[#A0A4A8]'
      }`}
    >
      <p className={`text-[10px] font-medium ${isSelf ? 'text-[var(--color-accent)]' : 'text-[#A0A4A8]'}`}>
        {senderName}
      </p>
      <p className="line-clamp-2 text-[11px] text-[#D3D6DA]">{content}</p>
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isSelf: boolean
  senderName: string
  avatarUrl: string
  displayContent: string
  currentUserId: string
  getVoterName: (userId: string) => string
  replyQuote?: { senderName: string; content: string } | null
  isNew?: boolean
  isSelected?: boolean
  selectionMode?: boolean
  onSelect?: (msg: Message) => void
  onContextMenu: (e: React.MouseEvent, msg: Message, anchorRect: AnchorRect) => void
  onVotePoll?: (msg: Message, optionIds: string[]) => Promise<void>
  onAddPollOption?: (msg: Message, text: string) => Promise<void>
}

function formatTime(sentAt: string) {
  return new Date(sentAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({
  message,
  isSelf,
  senderName,
  avatarUrl,
  displayContent,
  currentUserId,
  getVoterName,
  replyQuote,
  isNew,
  isSelected = false,
  selectionMode = false,
  onSelect,
  onContextMenu,
  onVotePoll,
  onAddPollOption,
}: MessageBubbleProps) {
  const time = formatTime(message.sentAt)
  const isPoll = message.messageType === 'poll' && message.pollData
  const isShort = !isPoll && displayContent.length < 28 && !replyQuote
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0)

  return (
    <div
      data-message-row
      className={`mb-2 flex items-end gap-1.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'} ${isNew ? 'animate-message-pop' : ''} ${
        selectionMode ? 'cursor-pointer' : ''
      }`}
      onClick={() => {
        if (selectionMode) onSelect?.(message)
      }}
      onContextMenu={(e) => {
        if (selectionMode) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        e.stopPropagation()
        const bubble = (e.currentTarget as HTMLElement).querySelector('[data-message-bubble]')
        const rect = (bubble ?? e.currentTarget).getBoundingClientRect()
        onContextMenu(e, message, {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        })
      }}
    >
      {!isSelf && <Avatar src={avatarUrl} name={senderName} size="xs" />}
      <div className={`max-w-[78%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        <GlassPanel
          variant={isSelf ? 'bubble-out' : 'bubble-in'}
          data-message-bubble
          className={`relative px-2.5 py-1.5 text-sm text-white ${isSelf ? 'rounded-br-sm' : 'rounded-bl-sm'} ${
            isSelected ? 'ring-2 ring-[var(--color-accent)]/80' : ''
          }`}
        >
          {selectionMode && (
            <span
              className={`absolute ${isSelf ? '-left-7' : '-right-7'} top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/25 text-[var(--color-accent)]'
                  : 'border-white/25 text-transparent'
              }`}
              aria-hidden="true"
            >
              ✓
            </span>
          )}
          {replyQuote && (
            <ReplyQuote
              senderName={replyQuote.senderName}
              content={replyQuote.content}
              isSelf={isSelf}
            />
          )}
          {message.isEncrypted && !isPoll && !displayContent.startsWith('🔒') && (
            <span className="mr-1 text-[10px]" aria-hidden="true">🔒</span>
          )}
          {isPoll && message.pollData ? (
            <>
              <PollMessage
                poll={message.pollData}
                currentUserId={currentUserId}
                isSelf={isSelf}
                getVoterName={getVoterName}
                onVote={async (optionIds) => {
                  if (onVotePoll) await onVotePoll(message, optionIds)
                }}
                onAddOption={async (text) => {
                  if (onAddPollOption) await onAddPollOption(message, text)
                }}
              />
              <p className={`mt-1 text-[10px] text-[#A0A4A8]/90 ${isSelf ? 'text-right' : 'text-left'}`}>
                {time}
              </p>
            </>
          ) : isShort ? (
            <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
              <span className="break-words">{displayContent}</span>
              <span className="shrink-0 text-[10px] leading-none text-[#A0A4A8]/90">{time}</span>
            </span>
          ) : (
            <>
              <p className="break-words pr-1">{displayContent}</p>
              <p className={`mt-0.5 text-[10px] text-[#A0A4A8]/90 ${isSelf ? 'text-right' : 'text-left'}`}>
                {time}
              </p>
            </>
          )}
        </GlassPanel>
        {reactionEntries.length > 0 && (
          <div className={`mt-0.5 flex flex-wrap gap-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, users]) => (
              <span
                key={emoji}
                className={`glass-chip rounded-full px-1.5 py-0.5 text-[10px] ${
                  users.includes(currentUserId) ? 'ring-1 ring-[var(--color-accent)]/60' : ''
                }`}
              >
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  getAvatar: (userId: string) => string
  getSenderName: (userId: string) => string
  decryptContent: (message: Message) => Promise<string>
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  onReply: (msg: Message) => void
  onForward: (msg: Message) => void
  onDelete: (msg: Message, forAll: boolean) => void
  onReact: (msg: Message, emoji: string) => void
  selectionMode?: boolean
  selectedMessageIds?: Set<string>
  onToggleMessageSelect?: (msg: Message) => void
  onStartSelectionMode: (msg: Message) => void
  onVotePoll?: (msg: Message, optionIds: string[]) => Promise<void>
  onAddPollOption?: (msg: Message, text: string) => Promise<void>
}

export function MessageList({
  messages,
  currentUserId,
  getAvatar,
  getSenderName,
  decryptContent,
  onLoadMore,
  hasMore,
  isLoading,
  onReply,
  onForward,
  onDelete,
  onReact,
  selectionMode = false,
  selectedMessageIds = new Set<string>(),
  onToggleMessageSelect,
  onStartSelectionMode,
  onVotePoll,
  onAddPollOption,
}: MessageListProps) {
  const [displayTexts, setDisplayTexts] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<{
    message: Message
    anchorRect: AnchorRect
  } | null>(null)
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messageById = Object.fromEntries(messages.map((m) => [m.$id, m]))

  useEffect(() => {
    void (async () => {
      const texts: Record<string, string> = {}
      for (const msg of messages) {
        texts[msg.$id] = msg.isEncrypted ? await decryptContent(msg) : msg.content
      }
      setDisplayTexts(texts)
    })()
  }, [messages, decryptContent])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last && last.$id !== lastMessageId) {
      setLastMessageId(last.$id)
    }
  }, [messages, lastMessageId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages.length <= 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages.length, messages[messages.length - 1]?.$id])

  const handleContextMenu = (
    _e: React.MouseEvent,
    msg: Message,
    anchorRect: AnchorRect,
  ) => {
    setContextMenu({ message: msg, anchorRect })
  }

  const handleCopy = async (msg: Message) => {
    const text = displayTexts[msg.$id] ?? msg.content
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  const getReplyQuote = (message: Message) => {
    if (!message.replyToId) return null
    const parent = messageById[message.replyToId]
    if (!parent) {
      return { senderName: 'Message', content: 'Original message unavailable' }
    }
    const content = displayTexts[parent.$id] ?? parent.content
    return {
      senderName: getSenderName(parent.senderId),
      content: content.slice(0, 120),
    }
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 40 && hasMore && !isLoading) {
            onLoadMore()
          }
        }}
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {isLoading && (
          <p className="animate-fade-in py-2 text-center text-xs text-[#A0A4A8]">Loading...</p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.$id}
            message={msg}
            isSelf={msg.senderId === currentUserId}
            senderName={getSenderName(msg.senderId)}
            avatarUrl={getAvatar(msg.senderId)}
            displayContent={displayTexts[msg.$id] ?? msg.content}
            currentUserId={currentUserId}
            getVoterName={getSenderName}
            replyQuote={getReplyQuote(msg)}
            isNew={msg.$id === lastMessageId}
            isSelected={selectedMessageIds.has(msg.$id)}
            selectionMode={selectionMode}
            onSelect={onToggleMessageSelect}
            onContextMenu={handleContextMenu}
            onVotePoll={onVotePoll}
            onAddPollOption={onAddPollOption}
          />
        ))}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          isSelf={contextMenu.message.senderId === currentUserId}
          anchorRect={contextMenu.anchorRect}
          onClose={() => setContextMenu(null)}
          onReply={onReply}
          onSelect={onStartSelectionMode}
          onForward={(msg) => {
            setContextMenu(null)
            onForward(msg)
          }}
          onCopy={handleCopy}
          onReact={onReact}
          onDelete={(msg, forAll) => onDelete(msg, forAll)}
        />
      )}
    </>
  )
}
