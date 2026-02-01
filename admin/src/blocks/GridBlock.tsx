import type { Block, GridBlockData, BlockStyles, TextBlockData, HeroBlockData, ButtonBlockData } from "../types"
import TextBlock from "./TextBlock"
import HeroBlock from "./HeroBlock"
import ButtonBlock from "./ButtonBlock"

export interface GridBlockProps {
  data: GridBlockData
  styles?: BlockStyles
}

const GRID_COLUMNS_DEFAULT = 12

const GridBlock = ({ data, styles = {} }: GridBlockProps) => {
  const { gridColumns = GRID_COLUMNS_DEFAULT, cells } = data
  const totalCols = gridColumns
  const style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
    gap: styles.gap ?? "8px",
    padding: styles.padding,
    backgroundColor: styles.backgroundColor,
    width: styles.width,
    position: styles.position ?? "static",
    top: styles.top,
    right: styles.right,
    bottom: styles.bottom,
    left: styles.left
  }

  const renderCellBlock = (block: Block) => {
    if (block.type === "text") return <TextBlock data={block.data as TextBlockData} styles={block.styles} />
    if (block.type === "hero") return <HeroBlock data={block.data as HeroBlockData} styles={block.styles} />
    if (block.type === "button") return <ButtonBlock data={block.data as ButtonBlockData} styles={block.styles} />
    if (block.type === "grid") return <GridBlock data={block.data as GridBlockData} styles={block.styles} />
    return (
      <div className="text-sm text-gray-500">
        Unknown: {block.type}
      </div>
    )
  }

  return (
    <div className="min-h-[60px] w-full" style={style}>
      {(cells ?? []).map((cell) => {
        const empty = cell.blocks.length === 0
        const span = cell.span != null ? Math.min(totalCols, Math.max(1, cell.span)) : Math.max(1, Math.floor(totalCols / (cells?.length ?? 1)))
        return (
        <div
          key={cell.id}
          className={` min-h-[48px] rounded 
            ${empty ? "" : "border border-dashed border-gray-300 bg-gray-50/50"}
            `}
          style={{ gridColumn: `span ${span}` }}
          data-cell-id={cell.id}
        >
          {empty ? (
            null
          ) : (
            <div className="p-2 flex flex-col gap-2">
              {cell.blocks.map((b) => (
                <div key={b.id} className="rounded border border-gray-100 bg-white p-2">
                  {renderCellBlock(b)}
                </div>
              ))}
            </div>
          )}
        </div>
      )})}
    </div>
  )
}

export default GridBlock
