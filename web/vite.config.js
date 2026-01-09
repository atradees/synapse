import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Kita tetap keep dedupe untuk keamanan
    dedupe: ['three', 'react', 'react-dom'], 
  },
  // HAPUS bagian optimizeDeps yang rumit tadi.
  // Kita balik ke setting standard karena versi library sudah damai.
  optimizeDeps: {
    exclude: ['js-big-decimal']
  },
  build: {
    rollupOptions: {
      external: ['three/addons/webgpu/WebGPURenderer.js']
    }
  }
})