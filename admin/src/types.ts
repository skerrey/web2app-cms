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

export type BlockData = TextBlockData | HeroBlockData | ButtonBlockData

/**
 * Common block styles (inspector + publish)
 */
export interface BlockStyles {
  width?: string
  padding?: string
  color?: string
  textAlign?: "left" | "center" | "right"
  fontSize?: string
  backgroundColor?: string
  [key: string]: string | undefined
}

/**
 * Block (normalized: id, type, data, styles)
 */
export interface Block {
  id: string
  type: "text" | "hero" | "button"
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
  data?: BlockData
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
