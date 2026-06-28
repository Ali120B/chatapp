import { useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { useAuthStore } from '@/store/authStore'
import { isAppwriteConfigured } from '@/services/appwrite'

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const { login, signup, isLoading, error, clearError } = useAuthStore()
  const configured = isAppwriteConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (mode === 'login') {
      await login(email, password)
    } else {
      await signup(email, password, username)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-4">
      <h1 className="mb-1 text-lg font-semibold text-white">Chat Overlay</h1>
      <p className="mb-4 text-xs text-[#A0A4A8]">Sign in to start messaging</p>

      {!configured && (
        <div className="glass-chip mb-4 w-full px-3 py-2 text-center text-[11px] text-[#E53E3E]">
          Appwrite not configured. Copy <code className="text-white">.env.setup.example</code> →{' '}
          <code className="text-white">.env.setup</code>, run{' '}
          <code className="text-white">npm run setup:appwrite</code>, then restart.
        </div>
      )}

      <div className="glass-pill mb-4 flex p-0.5">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors
            ${mode === 'login' ? 'bg-white/12 text-[#00B4FF]' : 'text-[#A0A4A8]'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors
            ${mode === 'signup' ? 'bg-white/12 text-[#00B4FF]' : 'text-[#A0A4A8]'}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2.5">
        {mode === 'signup' && (
          <GlassPanel variant="pill" className="px-3 py-2">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
              required
              aria-label="Username"
              data-needs-focus
            />
          </GlassPanel>
        )}
        <GlassPanel variant="pill" className="px-3 py-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
            required
            aria-label="Email"
            data-needs-focus
          />
        </GlassPanel>
        <GlassPanel variant="pill" className="px-3 py-2">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-[#A0A4A8] outline-none"
            required
            minLength={8}
            aria-label="Password"
            data-needs-focus
          />
        </GlassPanel>

        {error && (
          <p className="text-center text-xs text-[#E53E3E]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !configured}
          className="glass-pill mt-1 bg-[#00B4FF]/20 py-2.5 text-sm font-medium text-[#00B4FF] transition-opacity hover:bg-[#00B4FF]/30 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
