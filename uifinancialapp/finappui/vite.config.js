import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Путь к родительской директории (на 3 уровня выше)
  const parentDir = path.resolve(process.cwd(), '../../..')
  
  // Загружаем переменные окружения из родительской директории
  const env = loadEnv(mode, parentDir, '')
  
  console.log('Загруженные переменные:', env.VITE_ADMIN_LOGIN) // для проверки

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    // Делаем переменные доступными в import.meta.env
    define: {
      'import.meta.env.VITE_ADMIN_LOGIN': JSON.stringify(env.VITE_ADMIN_LOGIN),
      'import.meta.env.VITE_ADMIN_PASSWORD': JSON.stringify(env.VITE_ADMIN_PASSWORD),
      'import.meta.env.VITE_USER_LOGIN': JSON.stringify(env.VITE_USER_LOGIN),
      'import.meta.env.VITE_USER_PASSWORD': JSON.stringify(env.VITE_USER_PASSWORD)
    }
  }
})