import { GlassPanel } from '@/components/glass/GlassPanel'
import { useAuthStore } from '@/store/authStore'

export function EmailVerificationPending() {
  const email = useAuthStore((s) => s.email)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-4 text-center">
      <h1 className="mb-2 text-lg font-semibold text-white">Verify your email</h1>
      <p className="mb-4 text-xs leading-relaxed text-[#A0A4A8]">
        We sent a verification link to{' '}
        <span className="text-white">{email ?? 'your email'}</span>. Click the link, then sign in
        again.
      </p>

      <GlassPanel variant="chip" className="mb-4 w-full px-3 py-2 text-[11px] text-[#A0A4A8]">
        Link opens in your browser at{' '}
        <code className="text-white">{window.location.origin}/verify</code>
      </GlassPanel>

      {error && (
        <p className="mb-3 text-xs text-[#E53E3E]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={() => void resendVerification()}
        className="glass-pill mb-2 w-full bg-[#00B4FF]/20 py-2.5 text-sm font-medium text-[#00B4FF] disabled:opacity-50"
      >
        {isLoading ? 'Sending...' : 'Resend verification email'}
      </button>

      <button
        type="button"
        onClick={() => void logout()}
        className="glass-chip w-full py-2 text-xs text-[#A0A4A8]"
      >
        Back to login
      </button>
    </div>
  )
}
