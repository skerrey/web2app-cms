const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const rootDir = path.join(__dirname, "..")
const adminDir = path.join(rootDir, "admin")
const publicDir = path.join(rootDir, "public")
const adminDistDir = path.join(adminDir, "dist")
const contentDir = path.join(rootDir, "content")

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

console.log("Copying admin build to public/ (root)...")
copyRecursive(adminDistDir, publicDir)

console.log("Copying content to public/content/...")
const publicContentDir = path.join(publicDir, "content")
fs.mkdirSync(publicContentDir, { recursive: true })
copyRecursive(contentDir, publicContentDir)

const apkFromAndroid = path.join(rootDir, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
const apkFromContent = path.join(contentDir, "app-debug.apk")
const apkPath = fs.existsSync(apkFromAndroid) ? apkFromAndroid : (fs.existsSync(apkFromContent) ? apkFromContent : null)
if (apkPath) {
  console.log("Copying APK to public/app-debug.apk...")
  fs.copyFileSync(apkPath, path.join(publicDir, "app-debug.apk"))
  const adminPublicDir = path.join(adminDir, "public")
  fs.mkdirSync(adminPublicDir, { recursive: true })
  fs.copyFileSync(apkPath, path.join(adminPublicDir, "app-debug.apk"))
} else {
  console.log("APK not found. For production: put app-debug.apk in content/ and commit, or build Android locally first. Skip copying.")
}

console.log("Build complete!")
