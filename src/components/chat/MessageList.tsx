import { useEffect, useRef, useState } from 'react'
import type { Message } from '@/types'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { Avatar } from '@/components/common/Avatar'
import { MessageContextMenu, type AnchorRect } from './MessageContextMenu'
import { PollMessage } from './PollMessage'
import { DateSeparator } from './DateSeparator'
import { storage, APPWRITE_CONFIG } from '@/services/appwrite'
import { shouldShowDateSeparator, getDateLabel } from '@/utils/dateSeparators'
import { parseMessageContent } from '@/utils/linkify'

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

function LinkifiedText({ text }: { text: string }) {
  const segments = parseMessageContent(text)
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href="#"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.electronAPI?.openExternal?.(seg.value)
            }}
            className="break-all text-[var(--color-accent)] underline decoration-[var(--color-accent)]/40 decoration-1 underline-offset-2 hover:decoration-[var(--color-accent)]"
          >
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
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

function ReadReceipt({ isSelf, readBy }: { isSelf: boolean; readBy?: string[] }) {
  if (!isSelf) return null
  const read = (readBy?.length ?? 0) > 0
  return (
    <span className="ml-0.5 inline-flex items-center" aria-label={read ? 'Read' : 'Sent'}>
      {read ? (
        <svg width="14" height="9" viewBox="0 0 16 11" fill="none" className="text-[var(--color-accent)]">
          <path d="M1.5 5.5L5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5.5 5.5L9 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="11" height="9" viewBox="0 0 13 11" fill="none" className="text-[#A0A4A8]/70">
          <path d="M1.5 5.5L5 9L11.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
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
  const isShort = !isPoll && displayContent.length < 28 && !replyQuote && !message.editedAt
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0)
  const imageUrl = message.imageFileId ? storage.getFileView(APPWRITE_CONFIG.storageBucket, message.imageFileId) : null
  const isEdited = !!message.editedAt

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
          {imageUrl && (
            <img 
              src={String(imageUrl)} 
              alt="Attached" 
              className="mb-1 max-h-[180px] max-w-[180px] rounded object-cover" 
            />
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
                <ReadReceipt isSelf={isSelf} readBy={message.readBy} />
              </p>
            </>
          ) : isShort ? (
            <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
              <span className="break-words"><LinkifiedText text={displayContent} /></span>
              <span className="shrink-0 text-[10px] leading-none text-[#A0A4A8]/90">{time}<ReadReceipt isSelf={isSelf} readBy={message.readBy} /></span>
            </span>
          ) : (
            <>
              <p className="break-words pr-1"><LinkifiedText text={displayContent} /></p>
              <p className={`mt-0.5 text-[10px] text-[#A0A4A8]/90 ${isSelf ? 'text-right' : 'text-left'}`}>
                {time}
                <ReadReceipt isSelf={isSelf} readBy={message.readBy} />
                {isEdited && <span className="ml-1">(edited)</span>}
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
  chatId: string | null
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
  onEdit?: (msg: Message) => void
  selectionMode?: boolean
  selectedMessageIds?: Set<string>
  onToggleMessageSelect?: (msg: Message) => void
  onStartSelectionMode: (msg: Message) => void
  onVotePoll?: (msg: Message, optionIds: string[]) => Promise<void>
  onAddPollOption?: (msg: Message, text: string) => Promise<void>
}

export function MessageList({
  chatId,
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
  onEdit,
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
  const [showScrollFab, setShowScrollFab] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const previousChatIdRef = useRef<string | null>(null)
  const latestMessageId = messages[messages.length - 1]?.$id

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
    const isNewlyOpenedChat = previousChatIdRef.current !== chatId
    previousChatIdRef.current = chatId

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })

    if (isNewlyOpenedChat) {
      // Immediate + delayed re-scrolls to catch async content
      scrollToBottom()
      const t1 = setTimeout(scrollToBottom, 150)
      const t2 = setTimeout(scrollToBottom, 400)
      const t3 = setTimeout(scrollToBottom, 800)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }

    // New message arrived — only scroll if user was near bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages.length <= 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [chatId, messages.length, latestMessageId])

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

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop < 40 && hasMore && !isLoading) {
      onLoadMore()
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setShowScrollFab(!nearBottom && messages.length > 0)
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="scroll-thin relative min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {isLoading && (
          <p className="animate-fade-in py-2 text-center text-xs text-[#A0A4A8]">Loading...</p>
        )}
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : undefined
          const showDate = shouldShowDateSeparator(msg, prevMsg)
          return (
            <div key={msg.$id}>
              {showDate && <DateSeparator label={getDateLabel(msg.sentAt)} />}
              <MessageBubble
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
            </div>
          )
        })}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {showScrollFab && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="glass-chip absolute right-4 bottom-[4.5rem] z-10 flex h-9 w-9 items-center justify-center text-[#A0A4A8] shadow-lg transition-transform duration-200 hover:scale-105 hover:text-white"
          aria-label="Scroll to bottom"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      )}

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
          onEdit={onEdit}
        />
      )}
    </>
  )
}
