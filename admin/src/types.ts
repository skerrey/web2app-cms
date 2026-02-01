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

/** Grid/layout block: N columns, each cell holds child blocks */
export interface GridCell {
  id: string
  blocks: Block[]
}

export interface GridBlockData {
  columns: number
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
