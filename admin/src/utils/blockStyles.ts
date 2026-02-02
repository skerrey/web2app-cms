import type { CSSProperties } from "react"
import type { BlockStyles } from "../types"

/** Build padding and margin CSS from BlockStyles (all or per-side). */
export const blockStylesToSpacing = (styles?: BlockStyles): CSSProperties => {
  if (!styles) return {}
  return {
    paddingTop: styles.paddingTop ?? styles.padding,
    paddingRight: styles.paddingRight ?? styles.padding,
    paddingBottom: styles.paddingBottom ?? styles.padding,
    paddingLeft: styles.paddingLeft ?? styles.padding,
    marginTop: styles.marginTop ?? styles.margin,
    marginRight: styles.marginRight ?? styles.margin,
    marginBottom: styles.marginBottom ?? styles.margin,
    marginLeft: styles.marginLeft ?? styles.margin
  }
}
