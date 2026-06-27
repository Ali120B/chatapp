import { useRef, useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { Avatar } from '@/components/common/Avatar'
import { BottomNavPill } from '@/components/nav/BottomNavPill'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useThemeStore, THEME_OPTIONS } from '@/store/themeStore'

export function SettingsView() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const updateAvatar = useAuthStore((s) => s.updateAvatar)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const activeTab = useUiStore((s) => s.activeTab)
  const setTab = useUiStore((s) => s.setTab)
  const activeTheme = useThemeStore((s) => s.activeTheme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await updateAvatar(file)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  return (
    <div className="animate-fade-in flex h-full flex-col">
      <div className="scroll-thin flex-1 overflow-y-auto px-3 pt-3">
        <h2 className="mb-3 text-sm font-semibold text-white">Settings</h2>

        <GlassPanel variant="chip" className="mb-3 flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={isLoading}
            className="group relative shrink-0 rounded-full disabled:opacity-60"
            aria-label="Change profile photo"
          >
            <Avatar src={user.avatarUrl} name={user.username} size="lg" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isLoading ? '...' : 'Edit'}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleAvatarChange(e)}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-[#A0A4A8]">Tap photo to change</p>
          </div>
        </GlassPanel>

        <GlassPanel variant="chip" className="mb-3 p-3">
          <p className="mb-2 text-sm text-white">Accent color</p>
          <div className="grid grid-cols-4 gap-2">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-200
                  ${activeTheme === theme.id ? 'bg-white/12 ring-2 ring-[var(--color-accent)]' : 'hover:bg-white/5'}`}
                aria-label={theme.label}
                aria-pressed={activeTheme === theme.id}
              >
                <span
                  className="h-6 w-6 rounded-full shadow-inner"
                  style={{ backgroundColor: theme.hex }}
                />
                <span className="text-[9px] text-[#A0A4A8]">{theme.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        {error && (
          <p className="mb-3 text-center text-xs text-[#E53E3E]" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void logout()}
          className="glass-chip mb-2 w-full py-2.5 text-sm text-[#E53E3E] transition-colors duration-200 hover:bg-[#E53E3E]/10"
        >
          Log Out
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="glass-chip w-full py-2.5 text-sm text-[#E53E3E]/80 transition-colors duration-200 hover:bg-[#E53E3E]/10"
          >
            Delete Account
          </button>
        ) : (
          <div className="glass-chip p-3">
            <p className="mb-2 text-center text-xs text-[#A0A4A8]">
              This permanently deletes your account and profile. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg py-2 text-xs text-white hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void deleteAccount()}
                className="flex-1 rounded-lg bg-[#E53E3E]/20 py-2 text-xs text-[#E53E3E] disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 pb-3 pt-1">
        <BottomNavPill active={activeTab} onChange={setTab} />
      </div>
    </div>
  )
}
