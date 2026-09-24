import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import fs from 'node:fs';
import path from 'node:path';
import pkg from './package.json';

function swVersionPlugin() {
  let outDir = 'dist-react';
  return {
    name: 'sw-version-plugin',
    configResolved(config: any) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = path.resolve(outDir, 'sw.js');
      if (fs.existsSync(swPath)) {
        const content = fs.readFileSync(swPath, 'utf-8');
        const stamp = `/* version: ${pkg.version}-${Date.now()} */\n`;
        fs.writeFileSync(swPath, stamp + content, 'utf-8');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  base: './',
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
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
