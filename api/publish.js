const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });

  if (chunks.length === 0) {
    return null;
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text);
};

const validatePayload = (payload) => {
  if (!payload || typeof payload !== "object") return "Missing request body";
  const { manifest, content } = payload;
  if (!manifest || typeof manifest !== "object") return "Manifest is missing";
  if (!manifest.schemaVersion) return "Missing manifest.schemaVersion";
  if (!manifest.contentVersion) return "Missing manifest.contentVersion";
  if (!manifest.compatibleAppVersions || typeof manifest.compatibleAppVersions !== "object") {
    return "Missing manifest.compatibleAppVersions";
  }
  if (!manifest.compatibleAppVersions.min) return "Missing manifest.compatibleAppVersions.min";
  if (!manifest.compatibleAppVersions.max) return "Missing manifest.compatibleAppVersions.max";
  if (!Array.isArray(manifest.pagesOrder) || manifest.pagesOrder.length === 0) {
    return "Missing manifest.pagesOrder";
  }
  if (!content || typeof content !== "object") return "Content is missing";
  if (!Array.isArray(content.pages) || content.pages.length === 0) {
    return "Missing content.pages";
  }

  const hasInvalid = content.pages.some((page) => {
    if (!page || !page.id || !page.title || !Array.isArray(page.blocks)) return true;
    const textBlocks = page.blocks.filter((block) => block && block.type === "text" && block.text);
    return textBlocks.length === 0;
  });

  if (hasInvalid) return "Invalid page data in content.pages";
  return null;
};

const toBase64 = (value) => {
  return Buffer.from(value, "utf8").toString("base64");
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const createGitHubCommit = async ({ token, owner, repo, manifestJson, contentJson }) => {
  const apiBase = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json"
  };

  const githubRequest = async (url, options = {}) => {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    }, 10000);
    const text = await response.text();
    if (!response.ok) {
      const detail = text ? `: ${text}` : "";
      throw new Error(`GitHub request failed (${response.status})${detail}`);
    }
    return text ? JSON.parse(text) : null;
  };

  const refData = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/ref/heads/main`
  );
  const baseCommitSha = refData.object.sha;
  const baseCommit = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/commits/${baseCommitSha}`
  );
  const baseTreeSha = baseCommit.tree.sha;

  const manifestBlob = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({
        content: toBase64(manifestJson),
        encoding: "base64"
      })
    }
  );
  const contentBlob = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({
        content: toBase64(contentJson),
        encoding: "base64"
      })
    }
  );

  const tree = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: "content/manifest.json",
            mode: "100644",
            type: "blob",
            sha: manifestBlob.sha
          },
          {
            path: "content/content.json",
            mode: "100644",
            type: "blob",
            sha: contentBlob.sha
          }
        ]
      })
    }
  );

  const commit = await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: "Update CMS content",
        tree: tree.sha,
        parents: [baseCommitSha]
      })
    }
  );

  await githubRequest(
    `${apiBase}/repos/${owner}/${repo}/git/refs/heads/main`,
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false
      })
    }
  );

  return commit && commit.sha ? commit.sha : null;
};

const handler = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    console.log("Publish request started");
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const deployedOwner = process.env.VERCEL_GIT_REPO_OWNER;
    const deployedRepo = process.env.VERCEL_GIT_REPO_SLUG;

    if (!token || !owner || !repo) {
      res.status(500).json({ error: "Missing GitHub environment variables" });
      return;
    }
    if (
      deployedOwner &&
      deployedRepo &&
      (owner !== deployedOwner || repo !== deployedRepo)
    ) {
      res.status(403).json({ error: "Repository mismatch" });
      return;
    }

    const payload = await readJsonBody(req);
    const validationError = validatePayload(payload);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    console.log("Publish validation passed");

    const manifestJson = JSON.stringify(payload.manifest, null, 2);
    const contentJson = JSON.stringify(payload.content, null, 2);

    const commitSha = await createGitHubCommit({
      token,
      owner,
      repo,
      manifestJson,
      contentJson
    });
    if (commitSha) {
      console.log(`Publish commit created: ${commitSha}`);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error && error.message ? error.message : "Publish failed";
    res.status(500).json({ error: message });
  }
};

module.exports = handler;

module.exports.config = {
  runtime: "nodejs"
};
