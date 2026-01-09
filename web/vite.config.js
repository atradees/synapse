import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      
      // --- THE SURGICAL BYPASS ---
      // Ini memaksa Vite untuk membelokkan permintaan "three/webgpu" 
      // kembali ke "three" standard. Ini membungkam error "Missing specifier".
      { find: "three/webgpu", replacement: "three" }
    ],
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    exclude: ['js-big-decimal']
  },

  build: {
    // Pastikan commonjsOptions mengabaikan require dinamis yang aneh
    commonjsOptions: {
      ignoreTryCatch: false,
    },
  }
})
