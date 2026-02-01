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
  GridBlockData,
  GridCell,
  ContentPayload
} from "../types"

const MANIFEST_PATH = "/content/manifest.json"
const CONTENT_PATH = "/content/content.json"

const generateBlockId = (): string => {
  return "block_" + Math.random().toString(36).slice(2, 11)
}

const generateCellId = (): string => {
  return "cell_" + Math.random().toString(36).slice(2, 11)
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

export const createBlock = (type: "text" | "hero" | "button"): Block => {
  const data = defaultDataForType(type)
  const styles: Block["styles"] = type === "button" ? { width: "fit-content" } : {}
  return {
    id: generateBlockId(),
    type,
    data,
    styles
  }
}

const DEFAULT_GRID_COLUMNS = 12

const distributeSpans = (numCells: number, totalCols: number): number[] => {
  const base = Math.floor(totalCols / numCells)
  const remainder = totalCols - base * numCells
  return Array.from({ length: numCells }, (_, i) => base + (i < remainder ? 1 : 0))
}

export const createGridBlock = (columns: number): Block => {
  const gridColumns = DEFAULT_GRID_COLUMNS
  const spans = distributeSpans(columns, gridColumns)
  const cells: GridCell[] = Array.from({ length: columns }, (_, i) => ({
    id: generateCellId(),
    span: spans[i],
    blocks: []
  }))
  const data: GridBlockData = { columns, gridColumns, cells }
  return {
    id: generateBlockId(),
    type: "grid",
    data,
    styles: {}
  }
}

const normalizeBlock = (raw: RawBlock, _index: number): Block => {
  const type =
    raw.type === "hero" || raw.type === "button" || raw.type === "grid"
      ? raw.type
      : "text"
  const id = raw.id ?? generateBlockId()
  let data: Block["data"]
  if (type === "grid") {
    const gridRaw = raw.data as {
      columns?: number
      gridColumns?: number
      cells?: { id?: string; span?: number; blocks?: RawBlock[] }[]
    } | undefined
    const gridColumns = Math.min(24, Math.max(1, Number(gridRaw?.gridColumns) || DEFAULT_GRID_COLUMNS))
    const columns = Math.min(gridColumns, Math.max(1, Number(gridRaw?.columns) || 2))
    const rawCells = Array.isArray(gridRaw?.cells) ? gridRaw.cells : []
    const defaultSpans = distributeSpans(columns, gridColumns)
    const cells: GridCell[] = Array.from({ length: columns }, (_, i) => {
      const rc = rawCells[i]
      const cellId = rc?.id ?? generateCellId()
      const blocks = (Array.isArray(rc?.blocks) ? rc.blocks : []).map((b, j) => normalizeBlock(b, j))
      const span = rc?.span != null ? Math.min(gridColumns, Math.max(1, Number(rc.span))) : defaultSpans[i]
      return { id: cellId, span, blocks }
    })
    const spanSum = cells.reduce((s, c) => s + (c.span ?? 1), 0)
    const finalCells =
      spanSum !== gridColumns
        ? cells.map((c, i) => ({ ...c, span: distributeSpans(columns, gridColumns)[i] }))
        : cells
    data = { columns, gridColumns, cells: finalCells }
  } else if (raw.data) {
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

const validateBlock = (block: Block): boolean => {
  if (!block.id || !block.type || !block.data) return true
  if (block.type === "text" && typeof (block.data as { text?: string }).text !== "string") return true
  if (block.type === "grid") {
    const d = block.data as GridBlockData
    if (!Number.isInteger(d.columns) || !Array.isArray(d.cells)) return true
    return d.cells.some((cell) => !cell.id || !Array.isArray(cell.blocks) || cell.blocks.some(validateBlock))
  }
  return false
}

export const validateContent = (pages: Page[]): string | null => {
  if (!Array.isArray(pages) || pages.length === 0) return "Missing pages in content.json"
  const invalid = pages.some((page) => {
    if (!page.id || !page.title || !Array.isArray(page.blocks)) return true
    return page.blocks.some(validateBlock)
  })
  if (invalid) return "Invalid page or block data in content.json"
  return null
}

type SerializedBlock = {
  id: string
  type: string
  data: unknown
  styles: BlockStyles
  text?: string
}

const serializeBlock = (b: Block): SerializedBlock => {
  const base: SerializedBlock = {
    id: b.id,
    type: b.type,
    data:
      b.type === "grid"
        ? {
            columns: (b.data as GridBlockData).columns,
            gridColumns: (b.data as GridBlockData).gridColumns,
            cells: (b.data as GridBlockData).cells.map((cell) => ({
              id: cell.id,
              span: cell.span,
              blocks: cell.blocks.map(serializeBlock)
            }))
          }
        : b.data,
    styles: b.styles ?? {}
  }
  // Emit top-level `text` for text blocks so Android and legacy consumers can read it
  if (b.type === "text") {
    const text = (b.data as TextBlockData).text
    base.text = typeof text === "string" ? text : ""
  }
  return base
}

export const buildContentForPublish = (pages: Page[]): ContentPayload => {
  const payload = {
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      route: p.route ?? (p.id ? `/${p.id}` : "/"),
      blocks: p.blocks.map(serializeBlock)
    }))
  }
  return payload as unknown as ContentPayload
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
