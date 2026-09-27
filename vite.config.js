import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: path.resolve(import.meta.dirname, 'public'),
    emptyOutDir: false, // keep backup or any existing assets
  },
  server: {
    port: 3500,
    proxy: {
      '/api': {
        target: 'http://localhost:3200',
        changeOrigin: true
      }
    }
  }
});
