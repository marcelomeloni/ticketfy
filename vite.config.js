import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import nodePolyfills from 'rollup-plugin-node-polyfills'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Polyfills Node
      buffer: 'buffer',
      process: 'process/browser',
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      path: 'rollup-plugin-node-polyfills/polyfills/path',
      assert: 'rollup-plugin-node-polyfills/polyfills/assert',
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
      plugins: [nodePolyfills()]
    },
  },
  build: {
    rollupOptions: {
      plugins: [nodePolyfills()]
    },
  },
})
