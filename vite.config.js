import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true, // يتيح فتح الموقع من أي جهاز على نفس شبكة الواي فاي
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 3500,
  },
})
