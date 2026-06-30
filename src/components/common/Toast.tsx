import { useEffect } from 'react'
import type { Toast as ToastType } from '@/store/toastStore'
import { useToastStore } from '@/store/toastStore'

interface ToastProps {
  toast: ToastType
}

const iconByType: Record<ToastType['type'], string> = {
  error: '✕',
  success: '✓',
  info: 'i',
}

export function Toast({ toast }: ToastProps) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    if (!toast.duration) return
    const timer = setTimeout(() => removeToast(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  return (
    <div className="animate-slide-up glass-chip pointer-events-auto flex items-center gap-2 px-3 py-2 shadow-lg">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        toast.type === 'error' ? 'bg-[#E53E3E]/20 text-[#E53E3E]' :
        toast.type === 'success' ? 'bg-[#38A169]/20 text-[#38A169]' :
        'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
      }`}>
        {iconByType[toast.type]}
      </span>
      <span className="min-w-0 flex-1 text-xs text-white">{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-[#A0A4A8] hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
