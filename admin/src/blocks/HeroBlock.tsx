import type { HeroBlockData, BlockStyles } from "../types"
import { blockStylesToSpacing } from "../utils/blockStyles"

export interface HeroBlockProps {
  data: HeroBlockData
  styles?: BlockStyles
}

const contentAlignToJustify = (contentAlign?: string): "flex-start" | "center" | "flex-end" => {
  if (contentAlign === "center") return "center"
  if (contentAlign === "right") return "flex-end"
  return "flex-start"
}

const HeroBlock = ({ data, styles = {} }: HeroBlockProps) => {
  const { title, subtitle } = data
  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    justifyContent: contentAlignToJustify(styles.contentAlign)
  }
  const style: React.CSSProperties = {
    ...blockStylesToSpacing(styles),
    width: styles.width,
    height: styles.height,
    color: styles.color,
    textAlign: styles.textAlign ?? "left",
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor
  }
  return (
    <div style={wrapperStyle}>
      <div className="break-words" style={style}>
        <div className="font-semibold text-lg">{title || "(No title)"}</div>
        {subtitle != null && subtitle !== "" && (
          <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

export default HeroBlock
