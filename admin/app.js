const state = {
  data: null,
  sourcePath: "../content/content.json",
  manifestPath: "../content/manifest.json",
  manifest: null,
  isDirty: false,
  isPublishing: false
};

const statusEl = document.getElementById("status");
const pagesEl = document.getElementById("pages");
const outputEl = document.getElementById("output");
const reloadButton = document.getElementById("reloadButton");
const publishButton = document.getElementById("publishButton");

const token = import.meta.env.VITE_GITHUB_TOKEN;
const owner = import.meta.env.VITE_GITHUB_OWNER;
const repo = import.meta.env.VITE_GITHUB_REPO;

const setStatus = (message) => {
  statusEl.textContent = message;
};

const setPublishEnabled = (enabled) => {
  publishButton.disabled = !enabled;
};

const markDirty = () => {
  if (!state.isDirty) {
    state.isDirty = true;
    if (!state.isPublishing) {
      setPublishEnabled(true);
    }
  }
};

const loadContent = async () => {
  setStatus("Loading content.json...");
  outputEl.value = "";

  try {
    const [contentResponse, manifestResponse] = await Promise.all([
      fetch(state.sourcePath, { cache: "no-store" }),
      fetch(state.manifestPath, { cache: "no-store" })
    ]);
    if (!contentResponse.ok) {
      throw new Error("Unable to load content.json");
    }
    if (!manifestResponse.ok) {
      throw new Error("Unable to load manifest.json");
    }
    const contentJson = await contentResponse.json();
    const manifestJson = await manifestResponse.json();
    if (!contentJson || !Array.isArray(contentJson.pages)) {
      throw new Error("Invalid content.json structure");
    }
    if (!manifestJson || !Array.isArray(manifestJson.pagesOrder)) {
      throw new Error("Invalid manifest.json structure");
    }
    state.data = contentJson;
    state.manifest = manifestJson;
    state.isDirty = false;
    setPublishEnabled(false);
    renderPages();
    setStatus("Loaded content.json and manifest.json");
  } catch (error) {
    setStatus(error.message);
    pagesEl.innerHTML = "";
    state.data = null;
    state.manifest = null;
    state.isDirty = false;
    setPublishEnabled(false);
  }
};

const movePage = (index, direction) => {
  if (!state.data) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.data.pages.length) return;
  const pages = state.data.pages;
  const [page] = pages.splice(index, 1);
  pages.splice(newIndex, 0, page);
  markDirty();
  renderPages();
};

const updatePageTitle = (index, value) => {
  if (!state.data) return;
  state.data.pages[index].title = value;
  markDirty();
};

const updateBlockText = (pageIndex, blockIndex, value) => {
  if (!state.data) return;
  state.data.pages[pageIndex].blocks[blockIndex].text = value;
  markDirty();
};

const renderPages = () => {
  if (!state.data) return;
  pagesEl.innerHTML = "";

  state.data.pages.forEach((page, index) => {
    const pageEl = document.createElement("div");
    pageEl.className = "page";

    const headerEl = document.createElement("div");
    headerEl.className = "page-header";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = page.title || "";
    titleInput.setAttribute("aria-label", "Page title");
    titleInput.addEventListener("input", (event) => {
      updatePageTitle(index, event.target.value);
    });

    const moveUpButton = document.createElement("button");
    moveUpButton.type = "button";
    moveUpButton.textContent = "Move up";
    moveUpButton.disabled = index === 0;
    moveUpButton.addEventListener("click", () => movePage(index, -1));

    const moveDownButton = document.createElement("button");
    moveDownButton.type = "button";
    moveDownButton.textContent = "Move down";
    moveDownButton.disabled = index === state.data.pages.length - 1;
    moveDownButton.addEventListener("click", () => movePage(index, 1));

    headerEl.appendChild(titleInput);
    headerEl.appendChild(moveUpButton);
    headerEl.appendChild(moveDownButton);

    pageEl.appendChild(headerEl);

    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    blocks.forEach((block, blockIndex) => {
      if (block.type !== "text") return;
      const blockEl = document.createElement("div");
      blockEl.className = "block";

      const blockLabel = document.createElement("label");
      blockLabel.textContent = `Text block ${blockIndex + 1}`;

      const blockInput = document.createElement("textarea");
      blockInput.value = block.text || "";
      blockInput.addEventListener("input", (event) => {
        updateBlockText(index, blockIndex, event.target.value);
      });

      blockEl.appendChild(blockLabel);
      blockEl.appendChild(blockInput);
      pageEl.appendChild(blockEl);
    });

    pagesEl.appendChild(pageEl);
  });
};

const getEnvValue = (key) => {
  if (typeof window === "undefined") return "";
  return (
    window[key] ||
    (window.__ENV__ && window.__ENV__[key]) ||
    (window.ENV && window.ENV[key]) ||
    ""
  );
};

const validateManifestJson = (manifest) => {
  if (!manifest || typeof manifest !== "object") return "Manifest is missing";
  if (!manifest.schemaVersion) return "Missing schemaVersion in manifest.json";
  if (!manifest.contentVersion) return "Missing contentVersion in manifest.json";
  if (!manifest.compatibleAppVersions || typeof manifest.compatibleAppVersions !== "object") {
    return "Missing compatibleAppVersions in manifest.json";
  }
  if (!manifest.compatibleAppVersions.min) return "Missing compatibleAppVersions.min in manifest.json";
  if (!manifest.compatibleAppVersions.max) return "Missing compatibleAppVersions.max in manifest.json";
  if (!Array.isArray(manifest.pagesOrder) || manifest.pagesOrder.length === 0) {
    return "Missing pagesOrder in manifest.json";
  }
  return null;
};

const validateContentJson = (content) => {
  if (!content || typeof content !== "object") return "Content is missing";
  if (!Array.isArray(content.pages) || content.pages.length === 0) {
    return "Missing pages in content.json";
  }
  const hasInvalid = content.pages.some((page) => {
    if (!page.id || !page.title || !Array.isArray(page.blocks)) return true;
    return page.blocks.some((block) => !block.type || !block.text || block.type !== "text");
  });
  if (hasInvalid) return "Invalid page or block data in content.json";
  return null;
};

const toBase64 = (value) => {
  return btoa(unescape(encodeURIComponent(value)));
};

const buildContentJson = () => {
  if (!state.data) return null;
  return {
    pages: state.data.pages.map((page) => ({
      id: page.id,
      title: page.title,
      blocks: Array.isArray(page.blocks)
        ? page.blocks
            .filter((block) => block && block.type === "text")
            .map((block) => ({
              type: "text",
              text: block.text
            }))
        : []
    }))
  };
};

const buildManifestJson = () => {
  if (!state.manifest || !state.data) return null;
  return {
    schemaVersion: state.manifest.schemaVersion,
    contentVersion: state.manifest.contentVersion,
    compatibleAppVersions: {
      min: state.manifest.compatibleAppVersions?.min || "",
      max: state.manifest.compatibleAppVersions?.max || ""
    },
    pagesOrder: state.data.pages.map((page) => page.id),
    featureFlags: {
      showWelcomeBanner: Boolean(state.manifest.featureFlags?.showWelcomeBanner),
      enableHelpLink: Boolean(state.manifest.featureFlags?.enableHelpLink)
    }
  };
};

const publishToGitHub = async () => {
  if (state.isPublishing) return;
  if (!state.data) {
    setStatus("Nothing to publish");
    return;
  }

  if (typeof buildManifestJson !== "function" || typeof buildContentJson !== "function") {
    setStatus("Missing buildManifestJson or buildContentJson");
    return;
  }

  const manifest = buildManifestJson();
  const content = buildContentJson();

  const manifestError = validateManifestJson(manifest);
  if (manifestError) {
    setStatus(manifestError);
    return;
  }

  const contentError = validateContentJson(content);
  if (contentError) {
    setStatus(contentError);
    return;
  }

  if (!token || !owner || !repo) {
    const missing = [];
    if (!token) missing.push("VITE_GITHUB_TOKEN");
    if (!owner) missing.push("VITE_GITHUB_OWNER");
    if (!repo) missing.push("VITE_GITHUB_REPO");
    const message = `Missing GitHub environment values: ${missing.join(", ")}`;
    setStatus("Missing GitHub environment values");
    console.error(message);
    return;
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  const contentJson = JSON.stringify(content, null, 2);

  state.isPublishing = true;
  setPublishEnabled(false);
  setStatus("Publishing to GitHub...");

  const apiBase = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  };

  const githubRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    if (!response.ok) {
      const detail = text ? `: ${text}` : "";
      throw new Error(`GitHub request failed (${response.status})${detail}`);
    }
    return text ? JSON.parse(text) : null;
  };

  const readFileSha = async (path) => {
    try {
      const data = await githubRequest(`${apiBase}/repos/${owner}/${repo}/contents/${path}`);
      return data ? data.sha : null;
    } catch (error) {
      if (String(error.message).includes("(404)")) {
        return null;
      }
      throw error;
    }
  };

  try {
    await Promise.all([
      readFileSha("content/manifest.json"),
      readFileSha("content/content.json")
    ]);

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
          message: "Update content JSON",
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

    outputEl.value = contentJson;
    state.isDirty = false;
    setStatus("Published successfully");
  } catch (error) {
    setStatus(error.message || "Publish failed");
  } finally {
    state.isPublishing = false;
    if (state.isDirty) {
      setPublishEnabled(true);
    }
  }
};

reloadButton.addEventListener("click", loadContent);
publishButton.addEventListener("click", publishToGitHub);

loadContent();
