import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/spark-api': {
        target: 'https://api.sparklinkplayjoy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spark-api/, ''),
      },
    },
  },
})
