import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Base URL wajib untuk GitHub Pages
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: [
      // 1. Alias standar untuk folder src
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      
      // 2. THE SURGICAL BYPASS (FIX ERROR WEBGPU)
      // Ini menipu Vite: Setiap kali ada kode yang minta "three/webgpu",
      // kita paksa dia mengambil "three" biasa. Error hilang seketika.
      { find: "three/webgpu", replacement: "three" }
    ],
    // Dedupe wajib agar three.js tidak dimuat ganda
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },

  build: {
    // Pastikan kita tidak memblokir import CommonJS
    commonjsOptions: {
      ignoreTryCatch: false,
    },
    // JANGAN ADA CONFIG 'rollupOptions' -> 'external' DISINI LAGI
  }
})
