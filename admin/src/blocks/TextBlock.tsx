import type { TextBlockData, BlockStyles } from "../types"
import { blockStylesToSpacing } from "../utils/blockStyles"

export interface TextBlockProps {
  data: TextBlockData
  styles?: BlockStyles
}

const contentAlignToJustify = (contentAlign?: string): "flex-start" | "center" | "flex-end" => {
  if (contentAlign === "center") return "center"
  if (contentAlign === "right") return "flex-end"
  return "flex-start"
}

const TextBlock = ({ data, styles = {} }: TextBlockProps) => {
  const { text } = data
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
    backgroundColor: styles.backgroundColor,
    minHeight: "4.5rem"
  }
  return (
    <div style={wrapperStyle}>
      <div className="break-words whitespace-pre-wrap" style={style}>
        {text || "(Empty text)"}
      </div>
    </div>
  )
}

export default TextBlock
