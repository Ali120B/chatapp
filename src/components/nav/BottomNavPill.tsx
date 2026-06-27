import { useEffect, useRef, useState } from 'react'
import type { NavTab } from '@/types'

interface BottomNavPillProps {
  active: NavTab
  onChange: (tab: NavTab) => void
  badges?: Partial<Record<NavTab, number>>
}

const tabs: { id: NavTab; label: string }[] = [
  { id: 'chats', label: 'Chats' },
  { id: 'friends', label: 'Friends' },
  { id: 'settings', label: 'Settings' },
]

function TabIcon({ tab, active }: { tab: NavTab; active: boolean }) {
  const color = active ? 'var(--color-accent)' : '#A0A4A8'
  if (tab === 'chats') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  if (tab === 'friends') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export function BottomNavPill({ active, onChange, badges }: BottomNavPillProps) {
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Record<NavTab, HTMLButtonElement | null>>({
    chats: null,
    friends: null,
    settings: null,
  })
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const btn = tabRefs.current[active]
    const nav = navRef.current
    if (!btn || !nav) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setIndicator({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
    })
  }, [active])

  return (
    <nav
      ref={navRef}
      className="glass-pill relative mx-auto flex w-fit items-center gap-1 px-2 py-1.5"
      role="tablist"
      aria-label="Main navigation"
    >
      <span
        className="nav-indicator absolute top-1.5 bottom-1.5 rounded-full bg-white/12"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden="true"
      />
      {tabs.map((tab) => {
        const isActive = active === tab.id
        const badge = badges?.[tab.id] ?? 0
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200
              ${isActive ? 'text-[var(--color-accent)]' : 'text-[#A0A4A8] hover:text-white'}`}
          >
            <span className="relative">
              <TabIcon tab={tab.id} active={isActive} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
              )}
            </span>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
