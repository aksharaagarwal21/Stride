import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the browser talks to Vite on :5173 and Vite forwards /api to Express, so the
// session cookie is same-origin exactly as in production (where Express serves this build).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000' },
    },
  },
  preview: { port: 4173 },
});
