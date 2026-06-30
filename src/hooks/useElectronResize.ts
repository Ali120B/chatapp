import { useEffect } from 'react'
import { useUiStore } from '@/store/uiStore'

/** Resize Electron window to fit bubble + chat panel. */
export function useElectronResize(isWindowOpen: boolean) {
  useEffect(() => {
    if (!window.electronAPI?.resizeOverlay) return

    if (isWindowOpen) {
      const CHAT_WINDOW = { width: 380, height: 340 }
      const BUBBLE_SIZE = 48
      const width = CHAT_WINDOW.width
      const height = CHAT_WINDOW.height + BUBBLE_SIZE + 24
      window.electronAPI.resizeOverlay(width, height)
    } else {
      window.electronAPI.resizeOverlay(200, 200)
    }
  }, [isWindowOpen])
}
