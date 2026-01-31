import type { Block } from "../types"
import { getBlockComponent } from "../blocks"

export type EditorMode = "edit" | "layout"

export interface BlockCanvasProps {
  blocks: Block[]
  selectedBlockId: string | null
  mode: EditorMode
  onSelectBlock: (id: string | null) => void
  disabled?: boolean
}

const BlockCanvas = ({
  blocks,
  selectedBlockId,
  mode,
  onSelectBlock,
  disabled = false
}: BlockCanvasProps) => {
  return (
    <div className="block-canvas">
      <div className="block-canvas-list">
        {blocks.length === 0 ? (
          <p className="block-canvas-empty">No blocks. Add one from the library above.</p>
        ) : (
          blocks.map((block) => {
            const BlockComponent = getBlockComponent(block.type)
            const isSelected = selectedBlockId === block.id
            return (
              <div
                key={block.id}
                className={`block-canvas-item ${isSelected ? "is-selected" : ""}`}
                data-block-id={block.id}
              >
                {mode === "layout" && (
                  <div className="block-canvas-handle" aria-label="Drag handle">
                    ⋮⋮
                  </div>
                )}
                <button
                  type="button"
                  className="block-canvas-block"
                  onClick={() => onSelectBlock(isSelected ? null : block.id)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                >
                  {BlockComponent ? (
                    <BlockComponent data={block.data} styles={block.styles} />
                  ) : (
                    <span className="block-canvas-unknown">
                      Unknown block: {block.type}
                    </span>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default BlockCanvas
