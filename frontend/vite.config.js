import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Stamped into the bundle at build time so it's possible to tell, from the
// browser, exactly which commit is live. Vercel sets VERCEL_GIT_COMMIT_SHA.
const BUILD_SHA = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);
const BUILD_TIME = new Date().toISOString();

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/config': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
