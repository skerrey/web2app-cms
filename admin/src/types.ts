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

export interface ImageBlockData {
  imageUrl?: string
  alt?: string
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

export type BlockData = TextBlockData | HeroBlockData | ButtonBlockData | ImageBlockData | GridBlockData

/**
 * Common block styles (inspector + publish)
 */
export interface BlockStyles {
  width?: string
  height?: string
  /** Padding: use "padding" for all sides, or paddingTop/Right/Bottom/Left for per-side. */
  padding?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  /** Margin: use "margin" for all sides, or marginTop/Right/Bottom/Left for per-side. */
  margin?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  color?: string
  textAlign?: "left" | "center" | "right"
  contentAlign?: "left" | "center" | "right"
  fontSize?: string
  backgroundColor?: string
  borderRadius?: string
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
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
  type: "text" | "hero" | "button" | "image" | "grid"
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
