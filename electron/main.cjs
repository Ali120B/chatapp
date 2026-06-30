const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, nativeImage, Tray, shell } = require('electron')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')

// Optimizations for Windows (and other platforms) to reduce lag
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

const isDev = !app.isPackaged
const PROTOCOL = 'chatoverlay'

const BUBBLE_SIZE = 48
const WINDOW_SIZE = 200

// Auto updater config
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall(true, true)
})

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null
let alwaysOnTopTimer = null
/** @type {import('electron').Tray | null} */
let tray = null


function getTrayIconPath() {
  return path.join(__dirname, '..', 'build', 'icon.png')
}

function focusOverlay() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  assertAlwaysOnTop()
  mainWindow.setFocusable(true)
  mainWindow.show()
  mainWindow.focus()
  if (process.platform === 'win32') {
    app.focus({ steal: true })
    assertAlwaysOnTop()
  }
}

function handleGlobalFocusShortcut() {
  focusOverlay()
  mainWindow?.webContents.send('global-focus-shortcut')
}

function createTray() {
  if (process.platform !== 'win32' || tray) return

  const image = nativeImage.createFromPath(getTrayIconPath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('Chat Overlay')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show Chat Overlay',
        click: () => {
          focusOverlay()
          mainWindow?.webContents.send('global-focus-shortcut')
        },
      },
      { type: 'separator' },
      {
        label: 'Close (Quit)',
        click: () => app.quit(),
      },
    ]),
  )
  tray.on('click', () => {
    focusOverlay()
  })
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll()
  const registered = globalShortcut.register('Alt+Shift+Space', handleGlobalFocusShortcut)
  if (!registered) {
    console.warn('Failed to register Alt+Shift+Space global shortcut')
  }
}

function getPreloadPath() {
  const rootDir =
    path.basename(__dirname) === 'dist-electron'
      ? __dirname
      : path.join(__dirname, '..', 'dist-electron')
  return path.join(rootDir, 'preload.cjs')
}

function assertAlwaysOnTop() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (process.platform === 'win32') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  } else if (process.platform === 'linux') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  } else if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(true, 'floating', 1)
  } else {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  }
}

function startAlwaysOnTopRefresh() {
  clearInterval(alwaysOnTopTimer)
  alwaysOnTopTimer = setInterval(assertAlwaysOnTop, 1000)
}

function sendDeepLink(url) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== `${PROTOCOL}:`) return
    const pathPart = parsed.pathname.replace(/^\//, '') || parsed.hostname
    if (pathPart !== 'verify') return
    const userId = parsed.searchParams.get('userId')
    const secret = parsed.searchParams.get('secret')
    mainWindow.showInactive()
    mainWindow.webContents.send('deep-link', { type: 'verify', userId, secret })
  } catch {
    // invalid url
  }
}

function handleArgv(argv) {
  const link = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
  if (link) sendDeepLink(link)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.showInactive()
    }
    handleArgv(argv)
  })
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  sendDeepLink(url)
})

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()

  // Small floating window at center-right of screen
  const posX = workArea.x + workArea.width - WINDOW_SIZE - 16
  const posY = workArea.y + 100

  mainWindow = new BrowserWindow({
    x: posX,
    y: posY,
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    fullscreenable: false,
    acceptFirstMouse: true,
    thickFrame: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  assertAlwaysOnTop()

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.showInactive()
    startAlwaysOnTopRefresh()
    handleArgv(process.argv)
  })

  mainWindow.on('blur', assertAlwaysOnTop)
  mainWindow.on('hide', assertAlwaysOnTop)
  mainWindow.on('show', assertAlwaysOnTop)
  mainWindow.on('focus', assertAlwaysOnTop)

  mainWindow.on('closed', () => {
    clearInterval(alwaysOnTopTimer)
    alwaysOnTopTimer = null
    mainWindow = null
  })
}

ipcMain.on('set-focusable', (_event, focusable) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setFocusable(!!focusable)
  if (focusable) {
    mainWindow.webContents.focus()
    mainWindow.focus()
    if (process.platform === 'win32') {
      app.focus({ steal: true })
      assertAlwaysOnTop()
    }
  }
  assertAlwaysOnTop()
})

ipcMain.on('set-window-position', (_event, x, y) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setPosition(Math.round(x), Math.round(y))
})

ipcMain.handle('get-window-position', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return [0, 0]
  return mainWindow.getPosition()
})

ipcMain.on('resize-overlay', (_event, width, height) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [currentX, currentY] = mainWindow.getPosition()
  const [currentW, currentH] = mainWindow.getSize()

  mainWindow.setSize(Math.round(width), Math.round(height))

  // Anchor to bottom-center of current window position
  const newX = currentX + (currentW - width) / 2
  const newY = currentY + (currentH - height)
  mainWindow.setPosition(Math.round(newX), Math.round(Math.max(0, newY)))
})

ipcMain.handle('open-external', (_event, url) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      shell.openExternal(url)
    }
  } catch {
    // invalid url
  }
})

ipcMain.on('keep-on-top', () => {
  assertAlwaysOnTop()
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerGlobalShortcuts()
  
  if (!isDev && process.platform === 'win32') {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Failed to check for updates:', err)
    })
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
