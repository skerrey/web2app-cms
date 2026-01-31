const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const rootDir = path.join(__dirname, "..")
const adminDir = path.join(rootDir, "admin")
const publicDir = path.join(rootDir, "public")
const adminDistDir = path.join(adminDir, "dist")

const copyRecursive = (src, dest) => {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log("Installing admin dependencies...")
execSync("npm install", { cwd: adminDir, stdio: "inherit" })

console.log("Building admin...")
execSync("npm run build", { cwd: adminDir, stdio: "inherit" })

console.log("Copying build output to public/...")
fs.mkdirSync(publicDir, { recursive: true })
copyRecursive(adminDistDir, publicDir)

console.log("Build complete!")
