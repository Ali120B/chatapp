import { useEffect, useState } from 'react'
import { GlassPanel } from '@/components/glass/GlassPanel'
import { appwriteAuthService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

type VerifyStatus = 'working' | 'success' | 'error'

export function VerifyEmailView() {
  const [status, setStatus] = useState<VerifyStatus>('working')
  const [message, setMessage] = useState('Verifying your email...')
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const openWindow = useUiStore((s) => s.openWindow)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userId = params.get('userId')
    const secret = params.get('secret')

    if (!userId || !secret) {
      setStatus('error')
      setMessage('Invalid verification link. Request a new one from the app.')
      return
    }

    void (async () => {
      try {
        await appwriteAuthService.completeEmailVerification(userId, secret)
        setStatus('success')
        setMessage('Your email is verified. Welcome to Chat Overlay!')
        window.history.replaceState({}, '', '/')
        await restoreSession()
        openWindow()
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Verification failed. Try resending the email.')
      }
    })()
  }, [restoreSession, openWindow])

  const isElectron = Boolean(window.electronAPI)

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-4 text-center">
      <GlassPanel variant="chip" className="w-full max-w-[320px] p-5">
        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            status === 'success'
              ? 'bg-[#48BB78]/20 text-[#48BB78]'
              : status === 'error'
                ? 'bg-[#E53E3E]/20 text-[#E53E3E]'
                : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
          }`}
          aria-hidden="true"
        >
          {status === 'working' && '⏳'}
          {status === 'success' && '✓'}
          {status === 'error' && '✕'}
        </div>

        <h1 className="mb-1 text-sm font-semibold text-white">
          {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'}
        </h1>

        <p
          className={`text-xs leading-relaxed ${
            status === 'error' ? 'text-[#E53E3E]' : status === 'success' ? 'text-[#48BB78]' : 'text-[#A0A4A8]'
          }`}
        >
          {message}
        </p>

        {status === 'success' && (
          <p className="mt-3 text-[10px] text-[#A0A4A8]">
            {isElectron ? 'You are ready to chat.' : 'Return to the Chat Overlay app and sign in.'}
          </p>
        )}

        {status === 'error' && !isElectron && (
          <a
            href={`chatoverlay://verify${window.location.search}`}
            className="mt-3 inline-block text-xs text-[var(--color-accent)] hover:underline"
          >
            Open in Chat Overlay
          </a>
        )}
      </GlassPanel>
    </div>
  )
}
