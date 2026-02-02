import type { ImageBlockData, BlockStyles } from "../types"
import { blockStylesToSpacing } from "../utils/blockStyles"

interface ImageBlockProps {
  data: ImageBlockData
  styles?: BlockStyles
}

const ImageBlock = ({ data, styles }: ImageBlockProps) => {
  const { imageUrl, alt } = data
  const spacing = blockStylesToSpacing(styles)

  const containerStyle: React.CSSProperties = {
    ...spacing,
    width: styles?.width || "100%",
    display: "flex",
    justifyContent:
      styles?.contentAlign === "center"
        ? "center"
        : styles?.contentAlign === "right"
        ? "flex-end"
        : "flex-start"
  }

  const imgStyle: React.CSSProperties = {
    width: styles?.width || "auto",
    height: styles?.height || "auto",
    maxWidth: "100%",
    borderRadius: styles?.borderRadius,
    objectFit: styles?.objectFit || "cover",
    backgroundColor: styles?.backgroundColor
  }

  if (!imageUrl) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            ...imgStyle,
            minHeight: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            color: "#9ca3af",
            fontSize: "14px"
          }}
        >
          No image
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <img src={imageUrl} alt={alt || ""} style={imgStyle} />
    </div>
  )
}

export default ImageBlock
