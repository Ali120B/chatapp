const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setFocusable: (focusable) => {
    ipcRenderer.send('set-focusable', focusable)
  },
  keepOnTop: () => {
    ipcRenderer.send('keep-on-top')
  },
  setPosition: (x, y) => {
    ipcRenderer.send('set-window-position', x, y)
  },
  getPosition: () => ipcRenderer.invoke('get-window-position'),
  resizeOverlay: (width, height) => {
    ipcRenderer.send('resize-overlay', width, height)
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onDeepLink: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('deep-link', handler)
    return () => ipcRenderer.removeListener('deep-link', handler)
  },
  onGlobalFocusShortcut: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('global-focus-shortcut', handler)
    return () => ipcRenderer.removeListener('global-focus-shortcut', handler)
  },
  platform: process.platform,
})
