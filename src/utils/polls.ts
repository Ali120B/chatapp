import { ID } from '@/services/appwrite'

export interface PollOption {
  id: string
  text: string
}

export interface PollSettings {
  showWhoVoted: boolean
  allowMultipleAnswers: boolean
  allowAddingOptions: boolean
  allowRevoting: boolean
  shuffleOptions: boolean
  setCorrectAnswer: boolean
}

export interface PollData {
  question: string
  description: string
  options: PollOption[]
  settings: PollSettings
  correctOptionIds: string[]
  votes: Record<string, string[]>
}

export interface PollCreateInput {
  question: string
  description: string
  options: string[]
  settings: PollSettings
  correctOptionIndices: number[]
}

export const DEFAULT_POLL_SETTINGS: PollSettings = {
  showWhoVoted: true,
  allowMultipleAnswers: false,
  allowAddingOptions: false,
  allowRevoting: true,
  shuffleOptions: false,
  setCorrectAnswer: false,
}

export function createPollData(input: PollCreateInput): PollData {
  const options = input.options
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: ID.unique(), text }))
  const correctOptionIds = input.settings.setCorrectAnswer
    ? input.correctOptionIndices
        .filter((i) => i >= 0 && i < options.length)
        .map((i) => options[i].id)
    : []
  return {
    question: input.question.trim(),
    description: input.description.trim(),
    options,
    settings: input.settings,
    correctOptionIds,
    votes: {},
  }
}

export function parsePoll(raw: string | undefined | null): PollData | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as PollData
    if (!data.question || !Array.isArray(data.options)) return null
    return {
      question: data.question,
      description: data.description ?? '',
      options: data.options,
      settings: { ...DEFAULT_POLL_SETTINGS, ...data.settings },
      correctOptionIds: data.correctOptionIds ?? [],
      votes: data.votes ?? {},
    }
  } catch {
    return null
  }
}

export function serializePoll(poll: PollData): string {
  return JSON.stringify(poll)
}

export function pollPreview(poll: PollData): string {
  return `📊 ${poll.question.slice(0, 80)}`
}

export function userHasVoted(poll: PollData, userId: string): boolean {
  return Object.values(poll.votes).some((voters) => voters.includes(userId))
}

export function getUserVotes(poll: PollData, userId: string): string[] {
  return Object.entries(poll.votes)
    .filter(([, voters]) => voters.includes(userId))
    .map(([optionId]) => optionId)
}

export function totalVotes(poll: PollData): number {
  const voters = new Set<string>()
  for (const ids of Object.values(poll.votes)) {
    for (const id of ids) voters.add(id)
  }
  return voters.size
}

export function optionVoteCount(poll: PollData, optionId: string): number {
  return poll.votes[optionId]?.length ?? 0
}

function hashString(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h << 5) - h + value.charCodeAt(i)
  return h
}

export function getDisplayOptions(poll: PollData, viewerId: string): PollOption[] {
  if (!poll.settings.shuffleOptions) return poll.options
  return [...poll.options].sort(
    (a, b) => hashString(`${viewerId}:${a.id}`) - hashString(`${viewerId}:${b.id}`),
  )
}

export function applyVote(poll: PollData, userId: string, optionIds: string[]): PollData {
  const voted = userHasVoted(poll, userId)
  if (voted && !poll.settings.allowRevoting) {
    throw new Error('You already voted on this poll')
  }
  if (!poll.settings.allowMultipleAnswers && optionIds.length > 1) {
    throw new Error('This poll allows only one answer')
  }
  if (optionIds.length === 0) throw new Error('Select at least one option')

  const validIds = new Set(poll.options.map((o) => o.id))
  for (const id of optionIds) {
    if (!validIds.has(id)) throw new Error('Invalid poll option')
  }

  const nextVotes: Record<string, string[]> = {}
  for (const [optionId, voters] of Object.entries(poll.votes)) {
    const filtered = voters.filter((id) => id !== userId)
    if (filtered.length > 0) nextVotes[optionId] = filtered
  }

  for (const optionId of optionIds) {
    const existing = nextVotes[optionId] ?? []
    if (!existing.includes(userId)) {
      nextVotes[optionId] = [...existing, userId]
    }
  }

  return { ...poll, votes: nextVotes }
}

export function addPollOption(poll: PollData, text: string): PollData {
  if (!poll.settings.allowAddingOptions) throw new Error('Adding options is disabled')
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Option cannot be empty')
  return {
    ...poll,
    options: [...poll.options, { id: ID.unique(), text: trimmed }],
  }
}
