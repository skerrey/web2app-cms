import type { ButtonBlockData, BlockStyles } from "../types"

export interface ButtonBlockProps {
  data: ButtonBlockData
  styles?: BlockStyles
}

const ButtonBlock = ({ data, styles = {} }: ButtonBlockProps) => {
  const { label, url } = data
  const style: React.CSSProperties = {
    width: styles.width,
    padding: styles.padding,
    color: styles.color,
    textAlign: styles.textAlign,
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor
  }
  return (
    <div className="block-render block-render-button" style={style}>
      <span className="block-render-button-label">{label || "(Button)"}</span>
      {url != null && url !== "" && (
        <span className="block-render-button-url"> → {url}</span>
      )}
    </div>
  )
}

export default ButtonBlock
