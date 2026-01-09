import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // WAJIB: Sesuaikan dengan nama repo
  base: '/synapse/', 

  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Dedupe penting agar three.js tidak dimuat ganda (konflik memory)
    dedupe: ['three', 'react', 'react-dom'], 
  },

  optimizeDeps: {
    // Pastikan library matematika ini diproses dengan benar
    exclude: ['js-big-decimal']
  }
  
  // BAGIAN 'build' KITA HAPUS TOTAL
  // Karena setting default Vite v6/v7 sudah cukup pintar menangani three.js
})