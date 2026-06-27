import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { startup } from 'vite-plugin-electron'

// We launch Electron manually in npm run dev (see package.json).
// Prevents vite-plugin-electron from auto-starting with ELECTRON_RUN_AS_NODE set.
startup.prevent = true

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: path.join(__dirname, 'electron/main.cjs'),
        vite: {
          build: {
            outDir: 'dist-electron',
            rolldownOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'main.cjs',
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.cjs'),
        vite: {
          build: {
            rolldownOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: './',
})
