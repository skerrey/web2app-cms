import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(() => {
  const vercelDevUrl = process.env.VERCEL_DEV_URL
  const proxy =
    vercelDevUrl != null && vercelDevUrl !== ""
      ? {
          "/content": { target: vercelDevUrl, changeOrigin: true },
          "/api": { target: vercelDevUrl, changeOrigin: true }
        }
      : undefined

  return {
    base: "/admin",
    plugins: [react()],
    server: {
      proxy,
      port: 5173
    }
  }
})
