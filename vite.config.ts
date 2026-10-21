import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 开发/预览时把 /api 转发给本地文件服务（npm run store 或 npm run app）
  server: {
    proxy: { '/api': 'http://127.0.0.1:4600' },
  },
  preview: {
    proxy: { '/api': 'http://127.0.0.1:4600' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
