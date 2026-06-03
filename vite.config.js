import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Иначе PATCH длительности серии → запись library.json → Vite full-reload → бесконечный цикл на /watch
      ignored: ['**/server/**', '**/anime/**'],
    },
    proxy: {
      '/api': 'http://localhost:3001',
      '/media': 'http://localhost:3001',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/media': 'http://localhost:3001',
    },
  },
})
