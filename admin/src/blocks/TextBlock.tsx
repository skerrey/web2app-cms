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
    backgroundColor: styles.backgroundColor
  }
  return (
    <div className="block-render block-render-text" style={style}>
      {text || "(Empty text)"}
    </div>
  )
}

export default TextBlock
