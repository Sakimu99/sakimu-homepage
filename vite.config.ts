import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // 站点部署在域名根目录，且使用 BrowserRouter 子路由（/deposit/result），
  // 因此必须使用绝对路径 base，避免子路由下静态资源 404。
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      // 本地开发时把支付接口转发给 server/index.mjs（npm run dev:api）
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
