// Em: vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- Importe o 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'global': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer/',

      '@': path.resolve(__dirname, './src'),
    },
  },
})