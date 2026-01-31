import type { ButtonBlockData, BlockStyles } from "../types"

export interface ButtonBlockProps {
  data: ButtonBlockData
  styles?: BlockStyles
}

const ButtonBlock = ({ data, styles = {} }: ButtonBlockProps) => {
  const { label } = data
  const style: React.CSSProperties = {
    width: styles.width ?? "fit-content",
    padding: styles.padding,
    color: styles.color,
    textAlign: styles.textAlign,
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor
  }
  return (
    <div className="break-words inline-block" style={style}>
      <span className="font-medium">{label || "(Button)"}</span>
    </div>
  )
}

export default ButtonBlock
