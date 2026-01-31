import type {
  Manifest,
  Page,
  Block,
  BlockStyles,
  RawContent,
  RawPage,
  RawBlock,
  TextBlockData,
  HeroBlockData,
  ButtonBlockData,
  ContentPayload
} from "../types"

const MANIFEST_PATH = "/content/manifest.json"
const CONTENT_PATH = "/content/content.json"

const generateBlockId = (): string => {
  return "block_" + Math.random().toString(36).slice(2, 11)
}

const defaultDataForType = (
  type: "text" | "hero" | "button"
): TextBlockData | HeroBlockData | ButtonBlockData => {
  switch (type) {
    case "text":
      return { text: "" }
    case "hero":
      return { title: "", subtitle: "" }
    case "button":
      return { label: "", url: "" }
    default:
      return { text: "" }
  }
}

const normalizeBlock = (raw: RawBlock, _index: number): Block => {
  const type =
    raw.type === "hero" || raw.type === "button" ? raw.type : "text"
  const id = raw.id ?? generateBlockId()
  let data: Block["data"]
  if (raw.data) {
    data = raw.data as Block["data"]
  } else if (type === "text" && raw.text !== undefined) {
    data = { text: String(raw.text) }
  } else {
    data = defaultDataForType(type)
  }
  const styles: BlockStyles = raw.styles ?? {}
  return { id, type, data, styles }
}

const normalizePage = (raw: RawPage, index: number, _totalPages: number): Page => {
  const route = raw.route ?? (index === 0 ? "/" : `/${raw.id}`)
  const blocks = (raw.blocks ?? []).map((b, i) => normalizeBlock(b, i))
  return {
    id: raw.id,
    title: raw.title,
    route,
    blocks
  }
}

export const loadManifest = async (): Promise<Manifest> => {
  const res = await fetch(MANIFEST_PATH, { cache: "no-store" })
  if (!res.ok) throw new Error("Unable to load manifest.json")
  const json = await res.json()
  return json as Manifest
}

export const loadContent = async (): Promise<RawContent> => {
  const res = await fetch(CONTENT_PATH, { cache: "no-store" })
  if (!res.ok) throw new Error("Unable to load content.json")
  const json = await res.json()
  return json as RawContent
}

export const normalizeContent = (raw: RawContent): Page[] => {
  if (!raw?.pages || !Array.isArray(raw.pages)) return []
  return raw.pages.map((p, i) => normalizePage(p, i, raw.pages.length))
}

export const normalizeManifest = (manifest: Manifest): Manifest => {
  return {
    schemaVersion: manifest.schemaVersion ?? "v1",
    contentVersion: manifest.contentVersion ?? "1.0.0",
    compatibleAppVersions: {
      min: manifest.compatibleAppVersions?.min ?? "",
      max: manifest.compatibleAppVersions?.max ?? ""
    },
    pagesOrder: Array.isArray(manifest.pagesOrder) ? manifest.pagesOrder : [],
    featureFlags: {
      showWelcomeBanner: Boolean(manifest.featureFlags?.showWelcomeBanner),
      enableHelpLink: Boolean(manifest.featureFlags?.enableHelpLink)
    }
  }
}

export const validateManifest = (manifest: Manifest | null): string | null => {
  if (!manifest || typeof manifest !== "object") return "Manifest is missing"
  if (!manifest.schemaVersion) return "Missing schemaVersion in manifest.json"
  if (!manifest.contentVersion) return "Missing contentVersion in manifest.json"
  if (!manifest.compatibleAppVersions || typeof manifest.compatibleAppVersions !== "object") {
    return "Missing compatibleAppVersions in manifest.json"
  }
  if (!manifest.compatibleAppVersions.min) return "Missing compatibleAppVersions.min in manifest.json"
  if (!manifest.compatibleAppVersions.max) return "Missing compatibleAppVersions.max in manifest.json"
  if (!Array.isArray(manifest.pagesOrder) || manifest.pagesOrder.length === 0) {
    return "Missing pagesOrder in manifest.json"
  }
  return null
}

export const validateContent = (pages: Page[]): string | null => {
  if (!Array.isArray(pages) || pages.length === 0) return "Missing pages in content.json"
  const invalid = pages.some((page) => {
    if (!page.id || !page.title || !Array.isArray(page.blocks)) return true
    return page.blocks.some((block) => {
      if (!block.id || !block.type || !block.data) return true
      if (block.type === "text" && typeof (block.data as { text?: string }).text !== "string") return true
      return false
    })
  })
  if (invalid) return "Invalid page or block data in content.json"
  return null
}

export const buildContentForPublish = (pages: Page[]): ContentPayload => {
  return {
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      route: p.route ?? (p.id ? `/${p.id}` : "/"),
      blocks: p.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        data: b.data,
        styles: b.styles ?? {}
      }))
    }))
  }
}

export const buildManifestForPublish = (
  manifest: Manifest,
  pagesOrder: string[]
): Manifest => {
  return {
    ...normalizeManifest(manifest),
    pagesOrder: [...pagesOrder]
  }
}
