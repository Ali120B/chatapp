import { useRef, useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { DEFAULT_POLL_SETTINGS, type PollCreateInput } from '@/utils/polls'

interface CreatePollModalProps {
  onClose: () => void
  onSend: (poll: PollCreateInput) => Promise<void>
}

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white">{label}</p>
        <p className="text-[10px] text-[#A0A4A8]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--color-accent)]' : 'bg-white/20'
        }`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

const MAX_OPTIONS = 12

export function CreatePollModal({ onClose, onSend }: CreatePollModalProps) {
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [settings, setSettings] = useState(DEFAULT_POLL_SETTINGS)
  const [correctIds, setCorrectIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const questionRef = useRef<HTMLInputElement>(null)

  const focusField = () => window.electronAPI?.setFocusable?.(true)

  const optionKeys = options.map((_, i) => `opt-${i}`)
  const filledOptions = options.map((o) => o.trim()).filter(Boolean)

  const toggleCorrect = (index: number) => {
    const key = optionKeys[index]
    setCorrectIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else {
        if (!settings.allowMultipleAnswers) next.clear()
        next.add(key)
      }
      return next
    })
  }

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return
    setOptions((prev) => [...prev, ''])
  }

  const handleSend = async () => {
    if (!question.trim() || filledOptions.length < 2) return
    setSending(true)
    try {
      const correctOptionIndices = settings.setCorrectAnswer
        ? optionKeys
            .map((key, i) => (correctIds.has(key) && options[i]?.trim() ? i : -1))
            .filter((i) => i >= 0)
        : []
      await onSend({
        question: question.trim(),
        description: description.trim(),
        options: filledOptions,
        settings,
        correctOptionIndices,
      })
      onClose()
    } finally {
      setSending(false)
    }
  }

  const setSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    if (key === 'setCorrectAnswer' && !value) setCorrectIds(new Set())
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-2 sm:items-center"
      data-overlay-interactive
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <GlassPanel variant="chip" className="scroll-thin flex max-h-[92%] w-full max-w-[340px] flex-col p-3">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-[#A0A4A8] hover:text-white" aria-label="Close">
            ✕
          </button>
          <h3 className="text-sm font-semibold text-white">New Poll</h3>
          <button
            type="button"
            disabled={sending || !question.trim() || filledOptions.length < 2}
            onClick={() => void handleSend()}
            className="rounded-lg bg-[var(--color-accent)]/25 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)] disabled:opacity-40"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto pr-0.5">
          <div>
            <p className="mb-1 text-[10px] text-[#A0A4A8]">Question</p>
            <GlassPanel variant="pill" className="mb-1.5 px-3 py-2">
              <input
                ref={questionRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onPointerDown={focusField}
                onClick={focusField}
                placeholder="Ask a question"
                className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
                data-needs-focus
              />
            </GlassPanel>
            <GlassPanel variant="pill" className="px-3 py-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onPointerDown={focusField}
                onClick={focusField}
                placeholder="Description (optional)"
                className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
                data-needs-focus
              />
            </GlassPanel>
          </div>

          <div>
            <p className="mb-1 text-[10px] text-[#A0A4A8]">Options</p>
            {options.map((opt, i) => (
              <div key={optionKeys[i]} className="mb-1.5 flex items-center gap-1.5">
                {settings.setCorrectAnswer && (
                  <button
                    type="button"
                    onClick={() => toggleCorrect(i)}
                    disabled={!opt.trim()}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                      correctIds.has(optionKeys[i])
                        ? 'border-[#48BB78] bg-[#48BB78]/20 text-[#48BB78]'
                        : 'border-white/20 text-transparent'
                    }`}
                    aria-label="Mark as correct"
                  >
                    ✓
                  </button>
                )}
                <GlassPanel variant="pill" className="min-w-0 flex-1 px-3 py-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    onPointerDown={focusField}
                    onClick={focusField}
                    placeholder={i < 2 ? `Option ${i + 1}` : 'Add an option'}
                    className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
                    data-needs-focus
                  />
                </GlassPanel>
              </div>
            ))}
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={addOption}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-[#A0A4A8] hover:bg-white/5 hover:text-white"
              >
                <span className="text-base">+</span>
                Add an option
              </button>
            )}
            <p className="mt-1 text-[10px] text-[#A0A4A8]">
              You can add {MAX_OPTIONS - options.length} more option{MAX_OPTIONS - options.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] text-[#A0A4A8]">Settings</p>
            <GlassPanel variant="chip" className="divide-y divide-white/5 p-1">
              <Toggle
                label="Show who voted"
                description="Display voter names on each option"
                checked={settings.showWhoVoted}
                onChange={(v) => setSetting('showWhoVoted', v)}
              />
              <Toggle
                label="Allow multiple answers"
                description="Voters can select more than one option"
                checked={settings.allowMultipleAnswers}
                onChange={(v) => setSetting('allowMultipleAnswers', v)}
              />
              <Toggle
                label="Allow adding options"
                description="Participants can suggest new options"
                checked={settings.allowAddingOptions}
                onChange={(v) => setSetting('allowAddingOptions', v)}
              />
              <Toggle
                label="Allow revoting"
                description="Voters can change their vote"
                checked={settings.allowRevoting}
                onChange={(v) => setSetting('allowRevoting', v)}
              />
              <Toggle
                label="Shuffle options"
                description="Answers appear in random order per voter"
                checked={settings.shuffleOptions}
                onChange={(v) => setSetting('shuffleOptions', v)}
              />
              <Toggle
                label="Set correct answer"
                description="Mark one or more options as the right answer"
                checked={settings.setCorrectAnswer}
                onChange={(v) => setSetting('setCorrectAnswer', v)}
              />
            </GlassPanel>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
