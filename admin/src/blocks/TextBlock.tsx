import type { TextBlockData, BlockStyles } from "../types"

export interface TextBlockProps {
  data: TextBlockData
  styles?: BlockStyles
}

const TextBlock = ({ data, styles = {} }: TextBlockProps) => {
  const { text } = data
  const style: React.CSSProperties = {
    width: styles.width,
    padding: styles.padding,
    color: styles.color,
    textAlign: styles.textAlign,
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor,
    minHeight: "4.5rem"
  }
  return (
    <div
      className="text-left break-words whitespace-pre-wrap"
      style={style}
    >
      {text || "(Empty text)"}
    </div>
  )
}

export default TextBlock
