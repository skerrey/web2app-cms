import { useState, useEffect } from "react"
import {
  loadManifest,
  loadContent,
  normalizeContent,
  normalizeManifest,
  validateManifest,
  validateContent
} from "./lib/json"
import type { Manifest, Page } from "./types"
import PageList from "./components/PageList"

type LoadStatus = "idle" | "loading" | "loaded" | "error"

const reorderPagesByManifest = (pages: Page[], pagesOrder: string[]): Page[] => {
  const byId = new Map(pages.map((p) => [p.id, p]))
  const ordered: Page[] = []
  for (const id of pagesOrder) {
    const p = byId.get(id)
    if (p) ordered.push(p)
  }
  for (const p of pages) {
    if (!pagesOrder.includes(p.id)) ordered.push(p)
  }
  return ordered
}

const App = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle")
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      setIsPublishing(false)
    }
  }, [setIsPublishing])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadStatus("loading")
      setLoadError(null)
      try {
        const [rawManifest, rawContent] = await Promise.all([
          loadManifest(),
          loadContent()
        ])
        if (cancelled) return
        const normManifest = normalizeManifest(rawManifest)
        const manifestErr = validateManifest(normManifest)
        if (manifestErr) {
          setLoadError(manifestErr)
          setLoadStatus("error")
          return
        }
        const normPages = normalizeContent(rawContent)
        const contentErr = validateContent(normPages)
        if (contentErr) {
          setLoadError(contentErr)
          setLoadStatus("error")
          return
        }
        const ordered = reorderPagesByManifest(normPages, normManifest.pagesOrder)
        setManifest(normManifest)
        setPages(ordered)
        setSelectedPageId(ordered[0]?.id ?? null)
        setSelectedBlockId(null)
        setIsDirty(false)
        setLoadStatus("loaded")
        setLoadError(null)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Failed to load")
        setLoadStatus("error")
        setManifest(null)
        setPages([])
        setSelectedPageId(null)
        setSelectedBlockId(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const statusMessage =
    loadStatus === "loading"
      ? "Loading content..."
      : loadStatus === "loaded"
        ? `Loaded content.json and manifest.json (${pages.length} pages)`
        : loadStatus === "error"
          ? loadError ?? "Error"
          : ""

  const handleAddPage = (page: Page) => {
    setPages((prev) => [...prev, page])
    setManifest((prev) =>
      prev ? { ...prev, pagesOrder: [...prev.pagesOrder, page.id] } : null
    )
    setSelectedPageId(page.id)
    setIsDirty(true)
  }

  const handleDeletePage = (id: string) => {
    const nextPages = pages.filter((p) => p.id !== id)
    setPages(nextPages)
    setManifest((m) =>
      m ? { ...m, pagesOrder: nextPages.map((p) => p.id) } : null
    )
    setSelectedPageId((sid) => (sid === id ? nextPages[0]?.id ?? null : sid))
    setIsDirty(true)
  }

  const handleMovePage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= pages.length) return
    const next = [...pages]
    const [removed] = next.splice(index, 1)
    if (!removed) return
    next.splice(newIndex, 0, removed)
    setPages(next)
    setManifest((m) =>
      m ? { ...m, pagesOrder: next.map((p) => p.id) } : null
    )
    setIsDirty(true)
  }

  return (
    <main className="container">
      <header>
        <h1>Web2App CMS Admin</h1>
        <p>Block-based visual editor. (Sidebar, canvas, inspector + preview coming next.)</p>
      </header>
      <section className="actions">
        <button
          type="button"
          id="publishButton"
          disabled={!isDirty || isPublishing}
          aria-label="Publish changes"
        >
          Publish
        </button>
        <span id="status" className="status" aria-live="polite">
          {statusMessage}
        </span>
      </section>
      <section
        className="layout-placeholder"
        data-manifest-version={manifest?.schemaVersion}
        data-selected-page={selectedPageId ?? undefined}
        data-selected-block={selectedBlockId ?? undefined}
        data-dirty={isDirty}
        data-publishing={isPublishing}
      >
        <div className="layout-sidebar">
          <PageList
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onMovePage={handleMovePage}
            disabled={loadStatus !== "loaded"}
          />
        </div>
        <div className="layout-canvas">Blocks (canvas)</div>
        <div className="layout-right">Inspector + Preview</div>
      </section>
    </main>
  )
}

export default App
