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
    <div className="block-render block-render-hero" style={style}>
      <div className="block-render-hero-title">{title || "(No title)"}</div>
      {subtitle != null && subtitle !== "" && (
        <div className="block-render-hero-subtitle">{subtitle}</div>
      )}
    </div>
  )
}

export default HeroBlock
