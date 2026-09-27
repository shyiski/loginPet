import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    root: 'client',
    build: {
      outDir: path.resolve(import.meta.dirname, 'public'),
      emptyOutDir: false,
    },
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || '')
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
  };
});
