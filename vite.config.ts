import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // The app calls /api/... same-origin, exactly as it does behind nginx in
    // production. Proxying here means development needs no VITE_API_URL and no
    // CORS, and the request path is identical in both places.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
