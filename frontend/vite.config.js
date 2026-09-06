// Vite configuration file
// This sets up the Vite dev server to proxy /api and /auth requests to the backend on port 4000

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api requests to the Express backend
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Proxy /auth requests to the Express backend (for OAuth flows)
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})