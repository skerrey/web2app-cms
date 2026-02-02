import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import fs from "fs"

const serveContentFromRepo = () => ({
  name: "serve-content-from-repo",
  configureServer(server: { config: { root: string }; middlewares: { use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void } }) {
    const contentDir = path.resolve(server.config.root, "..", "content")
    server.middlewares.use((req: { url?: string; method?: string }, res: { statusCode: number; setHeader: (a: string, b: string) => void; end: (b?: unknown) => void }, next: () => void) => {
      const url = req.url ?? ""
      if (req.method !== "GET" && req.method !== "HEAD") {
        next()
        return
      }
      const pathname = url.split("?")[0] ?? url
      if (!pathname.startsWith("/content/") || pathname.includes("..")) {
        next()
        return
      }
      const subPath = pathname.slice("/content/".length)
      const filePath = path.join(contentDir, subPath)
      if (!filePath.startsWith(contentDir) || !fs.existsSync(filePath)) {
        next()
        return
      }
      const stat = fs.statSync(filePath)
      if (!stat.isFile()) {
        next()
        return
      }
      res.setHeader("Content-Type", url.endsWith(".json") ? "application/json" : "text/plain")
      res.statusCode = 200
      res.end(fs.readFileSync(filePath))
    })
  }
})

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
    base: "/",
    plugins: [react(), serveContentFromRepo()],
    server: {
      proxy,
      port: 5173
    }
  }
})
