import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // WAJIB: Sesuaikan string ini dengan nama repository GitHub Anda.
  // Karena URL repo Anda: https://github.com/atradees/synapse
  // Maka base-nya adalah '/synapse/'
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Penting untuk Three.js agar tidak ada konflik instance react/three
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },

  build: {
    rollupOptions: {
      // Externalize WebGPU renderer jika tidak digunakan/konflik build
      external: ['three/addons/webgpu/WebGPURenderer.js']
    }
  }
})