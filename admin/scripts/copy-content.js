import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(__dirname, "..", "..", "content")
const publicDir = path.join(__dirname, "..", "public", "content")

fs.mkdirSync(publicDir, { recursive: true })
fs.cpSync(contentDir, publicDir, { recursive: true })
