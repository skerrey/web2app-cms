const fs = require("fs");
const path = require("path");

const contentDir = path.join(__dirname, "..", "..", "content");
const publicDir = path.join(__dirname, "..", "public", "content");

fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(contentDir, publicDir, { recursive: true });
