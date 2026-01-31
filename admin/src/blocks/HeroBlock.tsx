import type { HeroBlockData, BlockStyles } from "../types"

export interface HeroBlockProps {
  data: HeroBlockData
  styles?: BlockStyles
}

const HeroBlock = ({ data, styles = {} }: HeroBlockProps) => {
  const { title, subtitle } = data
  const style: React.CSSProperties = {
    width: styles.width,
    padding: styles.padding,
    color: styles.color,
    textAlign: styles.textAlign,
    fontSize: styles.fontSize,
    backgroundColor: styles.backgroundColor
  }
  return (
    <div className="break-words" style={style}>
      <div className="font-semibold text-lg">{title || "(No title)"}</div>
      {subtitle != null && subtitle !== "" && (
        <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

export default HeroBlock
