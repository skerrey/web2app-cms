export type EditorMode = "edit" | "layout"

/**
 * Manifest (manifest.json)
 */
export interface CompatibleAppVersions {
  min: string
  max: string
}

export interface FeatureFlags {
  showWelcomeBanner?: boolean
  enableHelpLink?: boolean
}

export interface Manifest {
  schemaVersion: string
  contentVersion: string
  compatibleAppVersions: CompatibleAppVersions
  pagesOrder: string[]
  featureFlags?: FeatureFlags
}

/**
 * Block data by type (for editor and preview)
 */
export interface TextBlockData {
  text: string
}

export interface HeroBlockData {
  title: string
  subtitle?: string
  imageUrl?: string
}

export interface ButtonBlockData {
  label: string
  url?: string
}

/** Grid/layout block: N columns, each cell holds child blocks. gridColumns = total columns (e.g. 12); each cell.span = columns it spans. */
export interface GridCell {
  id: string
  /** Number of grid columns this cell spans (1 to gridColumns). Defaults to equal split. */
  span?: number
  blocks: Block[]
}

export interface GridBlockData {
  /** Number of cells (length of cells array). Kept for backward compat. */
  columns: number
  /** Total grid columns (e.g. 12). Sum of cell spans should equal this. */
  gridColumns?: number
  cells: GridCell[]
}

export type BlockData = TextBlockData | HeroBlockData | ButtonBlockData | GridBlockData

/**
 * Common block styles (inspector + publish)
 */
export interface BlockStyles {
  width?: string
  padding?: string
  color?: string
  textAlign?: "left" | "center" | "right"
  contentAlign?: "left" | "center" | "right"
  fontSize?: string
  backgroundColor?: string
  /** Grid/layout: position (static, relative, absolute, fixed, sticky) */
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky"
  /** Grid/layout: inset for position (e.g. "0", "auto") */
  top?: string
  right?: string
  bottom?: string
  left?: string
  [key: string]: string | undefined
}

/**
 * Block (normalized: id, type, data, styles)
 */
export interface Block {
  id: string
  type: "text" | "hero" | "button" | "grid"
  data: BlockData
  styles?: BlockStyles
}

/**
 * Page (normalized: route, blocks with id/data/styles)
 */
export interface Page {
  id: string
  title: string
  route?: string
  blocks: Block[]
}

/**
 * Content payload (content.json shape for API)
 */
export interface ContentPayload {
  pages: Page[]
}

/**
 * Raw block from JSON (may have legacy type+text only)
 */
export interface RawBlock {
  id?: string
  type: string
  text?: string
  data?: unknown
  styles?: BlockStyles
}

/**
 * Raw page from JSON
 */
export interface RawPage {
  id: string
  title: string
  route?: string
  blocks: RawBlock[]
}

/**
 * Raw content from JSON
 */
export interface RawContent {
  pages: RawPage[]
}
