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
  optimizeDeps: {
    exclude: ['argon2-browser'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ✅ ADICIONADO: Configuração de Build para resolver o problema de memória
  build: {
    // Desativar a geração de source maps para o build de produção.
    // Esta é a maneira mais eficaz de reduzir o consumo de memória
    // durante o processo de `vite build` e evitar o erro "heap out of memory".
    sourcemap: false,
  },
});
