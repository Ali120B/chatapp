# App Icons

Place your application icons in this folder. `electron-builder` will automatically detect them during the build process.

- **Windows / Linux:** Add a 512x512 PNG file named `icon.png`.
- **macOS:** Add an ICNS file named `icon.icns` (if you plan to build for Mac later).
- **Background / Custom installers:** You can also add `background.png` or `background.tiff` for the DMG installer background.

Once you add `icon.png` here, `npm run publish` or `npm run build:electron` will use it as the app's desktop and taskbar icon.
