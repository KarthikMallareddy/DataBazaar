import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  publicDir: "public",
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ],
  resolve: {
  alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
    ],
  // Ensure only one copy of React is used to avoid "Invalid hook call" errors
  dedupe: ['@dfinity/agent', 'react', 'react-dom'],
  },
});
