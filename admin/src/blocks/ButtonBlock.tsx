import type { ButtonBlockData, BlockStyles } from "../types"

export interface ButtonBlockProps {
  data: ButtonBlockData
  styles?: BlockStyles
}

const contentAlignToJustify = (contentAlign?: string): "flex-start" | "center" | "flex-end" => {
  if (contentAlign === "center") return "center"
  if (contentAlign === "right") return "flex-end"
  return "flex-start"
}

const ButtonBlock = ({ data, styles = {} }: ButtonBlockProps) => {
  const { label } = data
  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    justifyContent: contentAlignToJustify(styles.contentAlign)
  }
  const style: React.CSSProperties = {
    width: styles.width ?? "fit-content",
    padding: styles.padding,
    color: styles.color,
    textAlign: styles.textAlign ?? "left",
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor
  }
  return (
    <div style={wrapperStyle}>
      <div className="break-words inline-block" style={style}>
        <span className="font-medium">{label || "(Button)"}</span>
      </div>
    </div>
  )
}

export default ButtonBlock
