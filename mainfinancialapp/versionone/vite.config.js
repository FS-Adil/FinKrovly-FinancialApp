import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Прокси для локальной разработки (обход CORS)
    proxy: {
      // '/child-two': {
      //   target: 'http://localhost:3001',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/child-two/, ''),
      // },
      // '/child-two': {
      //   target: 'http://localhost:3002',
      //   changeOrigin: true,
      //   // rewrite: (path) => path.replace(/^\/child-two/, ''),
      // },
      // '/child3': {
      //   target: 'http://localhost:3003',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/child3/, ''),
      // },
    },
  },
})