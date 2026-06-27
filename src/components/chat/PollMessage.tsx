import { useEffect, useState } from 'react'
import type { PollData } from '@/types'
import {
  getDisplayOptions,
  getUserVotes,
  optionVoteCount,
  totalVotes,
  userHasVoted,
} from '@/utils/polls'

interface PollMessageProps {
  poll: PollData
  currentUserId: string
  isSelf: boolean
  getVoterName: (userId: string) => string
  onVote: (optionIds: string[]) => Promise<void>
  onAddOption: (text: string) => Promise<void>
}

export function PollMessage({
  poll,
  currentUserId,
  isSelf,
  getVoterName,
  onVote,
  onAddOption,
}: PollMessageProps) {
  const [selected, setSelected] = useState<string[]>(() => getUserVotes(poll, currentUserId))
  const [newOption, setNewOption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(getUserVotes(poll, currentUserId))
  }, [poll, currentUserId])

  const voted = userHasVoted(poll, currentUserId)
  const showResults = voted || isSelf
  const total = totalVotes(poll)
  const displayOptions = getDisplayOptions(poll, currentUserId)

  const toggleSelect = (optionId: string) => {
    if (showResults && !poll.settings.allowRevoting) return
    setSelected((prev) => {
      if (poll.settings.allowMultipleAnswers) {
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      }
      return prev.includes(optionId) ? [] : [optionId]
    })
  }

  const handleVote = async () => {
    if (selected.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await onVote(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not vote')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddOption = async () => {
    if (!newOption.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onAddOption(newOption.trim())
      setNewOption('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add option')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-[200px]">
      <p className="mb-0.5 text-sm font-medium text-white">{poll.question}</p>
      {poll.description && (
        <p className="mb-2 text-[11px] text-[#A0A4A8]">{poll.description}</p>
      )}

      <div className="space-y-1.5">
        {displayOptions.map((option) => {
          const count = optionVoteCount(poll, option.id)
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isCorrect = poll.settings.setCorrectAnswer && poll.correctOptionIds.includes(option.id)
          const isSelected = selected.includes(option.id)
          const voters = poll.votes[option.id] ?? []

          return (
            <button
              key={option.id}
              type="button"
              disabled={submitting || (showResults && !poll.settings.allowRevoting)}
              onClick={() => toggleSelect(option.id)}
              className={`relative w-full overflow-hidden rounded-xl border px-2.5 py-2 text-left transition-colors ${
                isSelected
                  ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              } ${showResults && !poll.settings.allowRevoting ? 'cursor-default' : ''}`}
            >
              {showResults && (
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--color-accent)]/15 transition-all"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-xs text-white">
                  {option.text}
                  {isCorrect && showResults && (
                    <span className="ml-1 text-[#48BB78]" aria-label="Correct answer">✓</span>
                  )}
                </span>
                {showResults && (
                  <span className="shrink-0 text-[10px] text-[#A0A4A8]">{pct}%</span>
                )}
              </div>
              {showResults && poll.settings.showWhoVoted && voters.length > 0 && (
                <p className="relative mt-1 text-[10px] text-[#A0A4A8]">
                  {voters.map(getVoterName).join(', ')}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {!showResults && (
        <button
          type="button"
          disabled={submitting || selected.length === 0}
          onClick={() => void handleVote()}
          className="mt-2 w-full rounded-xl bg-[var(--color-accent)]/20 py-1.5 text-xs font-medium text-[var(--color-accent)] disabled:opacity-40"
        >
          Vote
        </button>
      )}

      {showResults && poll.settings.allowRevoting && selected.length > 0 && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleVote()}
          className="mt-2 w-full rounded-xl bg-white/8 py-1.5 text-xs text-white disabled:opacity-40"
        >
          Update vote
        </button>
      )}

      {poll.settings.allowAddingOptions && !voted && (
        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Suggest an option"
            className="min-w-0 flex-1 rounded-xl bg-white/6 px-2 py-1.5 text-xs text-white outline-none placeholder:text-[#A0A4A8]"
            data-needs-focus
            onPointerDown={() => window.electronAPI?.setFocusable?.(true)}
          />
          <button
            type="button"
            disabled={submitting || !newOption.trim()}
            onClick={() => void handleAddOption()}
            className="rounded-xl bg-white/8 px-2.5 text-xs text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      {showResults && (
        <p className="mt-2 text-[10px] text-[#A0A4A8]">
          {total} vote{total === 1 ? '' : 's'}
        </p>
      )}

      {error && <p className="mt-1 text-[10px] text-[#E53E3E]">{error}</p>}
    </div>
  )
}
