import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Output to ../frontend/pages so the Express backend can serve it
    // (backend: res.sendFile(frontendPath + '/pages/index.html'))
    outDir: '../frontend/pages',
    emptyOutDir: false,
  },
  // base must match outDir name so asset URLs resolve correctly when
  // Express serves index.html via the SPA fallback (static root = /frontend)
  base: '/pages/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/compute-stats': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
