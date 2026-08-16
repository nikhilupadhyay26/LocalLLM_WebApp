import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// LocalDesk is a 100% static build: no server code, no API routes, no env
// secrets. `dist/` is deployable to any CDN as-is.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    // WebLLM/Transformers.js ship large wasm/model-loading chunks; raise the
    // warning threshold instead of fighting an in-browser inference stack.
    chunkSizeWarningLimit: 4000,
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
});
