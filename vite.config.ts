import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'declarations': path.resolve(__dirname, './src/declarations')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.DFX_NETWORK': JSON.stringify('local'),
    'process.env.DFX_HOST': JSON.stringify('http://127.0.0.1:4943'),
    'process.env.CANISTER_ID_BACKEND': JSON.stringify('uxrrr-q7777-77774-qaaaq-cai'),
    'process.env.CANISTER_ID_FRONTEND': JSON.stringify('uzt4z-lp777-77774-qaabq-cai'),
    'global': 'globalThis',
    'process.env': '{}'
  }
});
