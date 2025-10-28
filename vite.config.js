import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy is disabled - using deployed backend directly
    // Configure backend URL in src/utils/api.js
  }
})
