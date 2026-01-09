import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Base URL untuk GitHub Pages
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe wajib untuk Three.js
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },

  build: {
    // Kita kosongkan rollupOptions agar Vite mengatur otomatis
    // Jangan ada external config manual untuk three.js
    rollupOptions: {} 
  }
})
