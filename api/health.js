const handler = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" })
    return
  }

  try {
    const previewMode = process.env.PREVIEW === "true"
    const token = process.env.GITHUB_TOKEN
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    
    const configured = !!(token && owner && repo)
    const canPublish = configured && !previewMode
    
    res.status(200).json({
      ok: true,
      configured,
      canPublish,
      previewMode
    })
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: "Health check failed" 
    })
  }
}

module.exports = handler

module.exports.config = {
  runtime: "nodejs"
}
