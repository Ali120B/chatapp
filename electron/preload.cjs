const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options)
  },
  setFocusable: (focusable) => {
    ipcRenderer.send('set-focusable', focusable)
  },
  keepOnTop: () => {
    ipcRenderer.send('keep-on-top')
  },
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
