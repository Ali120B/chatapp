import { useEffect } from 'react'
import { useUiStore } from '@/store/uiStore'

/** Fullscreen overlay: click-through on transparent areas, interactive on bubble/chat. */
export function useMousePassthrough() {
  const isDragging = useUiStore((s) => s.isDragging)

  useEffect(() => {
    if (!window.electronAPI?.setIgnoreMouseEvents) return

    let ignoring = true

    const apply = (ignore: boolean) => {
      if (ignore === ignoring) return
      ignoring = ignore
      window.electronAPI!.setIgnoreMouseEvents!(ignore, { forward: true })
    }

    const isInteractiveAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      return !!el?.closest('[data-overlay-interactive]')
    }

    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        apply(false)
        return
      }
      apply(!isInteractiveAt(e.clientX, e.clientY))
    }

    const onDown = (e: MouseEvent) => {
      if (isInteractiveAt(e.clientX, e.clientY)) apply(false)
    }

    apply(true)
    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mousedown', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      apply(false)
    }
  }, [isDragging])
}
