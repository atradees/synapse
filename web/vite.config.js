import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // WAJIB: Sesuaikan dengan nama repo 'synapse' (pake E)
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },

  build: {
    rollupOptions: {
      external: ['three/addons/webgpu/WebGPURenderer.js']
    }
  }
})