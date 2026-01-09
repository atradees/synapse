import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Base URL wajib untuk GitHub Pages
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe tetap penting
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },
  
  // Build config kita serahkan ke default Vite
  build: {
    commonjsOptions: {
      ignoreTryCatch: false,
    },
  }
})
