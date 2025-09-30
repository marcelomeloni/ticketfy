import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    wasm(),
    topLevelAwait(),
  ],
  // 1. Adicione a configuração optimizeDeps
  optimizeDeps: {
    // 2. Exclua o 'argon2-browser' da otimização do Vite
    // Isso permite que o plugin wasm lide com ele corretamente.
    exclude: ['argon2-browser'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

