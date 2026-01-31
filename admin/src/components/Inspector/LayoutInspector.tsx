import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import type { Block, BlockStyles } from "../../types"

export interface LayoutInspectorProps {
  block: Block | null
  onUpdateBlock?: (block: Block) => void
  disabled?: boolean
  onAddLayoutBlock?: (columns: number) => void
}

const LAYOUT_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12]

const DraggableLayoutPreset = ({
  cols,
  disabled,
  isSelected,
  onAdd,
  onMouseEnter,
  onMouseLeave,
  renderPreview,
  children
}: {
  cols: number
  disabled: boolean
  isSelected: boolean
  onAdd: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  renderPreview: (cols: number) => React.ReactNode
  children?: React.ReactNode | null
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-preset-${cols}`,
    data: { type: "layout-preset", columns: cols }
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onAdd()
        }}
        disabled={disabled}
        className={`
          w-full rounded-md border p-2 transition text-left cursor-grab active:cursor-grabbing
          ${isSelected ? "border-primary bg-primary-light" : "border-gray-300 hover:bg-gray-50"}
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isDragging ? "opacity-50" : ""}
        `}
        aria-label={`Add ${cols} column layout (or drag to canvas)`}
      >
        {renderPreview(cols)}
        <span className="text-xs text-gray-500 mt-1 block">{cols} columns</span>
        {children}
      </button>
    </div>
  )
}

const inputClass =
  "w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
const fieldClass = "flex flex-col gap-1"

const LayoutInspector = ({
  block,
  onUpdateBlock,
  disabled = false,
  onAddLayoutBlock
}: LayoutInspectorProps) => {
  const [hoveringCols, setHoveringCols] = useState<number | null>(null)

  const renderPreview = (cols: number) => (
    <div
      className="grid w-full h-10 rounded-md p-[2px] gap-[7px]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="bg-gray-400 rounded-sm" />
      ))}
    </div>
  )

  const updateStyles = block && onUpdateBlock
    ? (styles: BlockStyles) => {
        onUpdateBlock({ ...block, styles: { ...block.styles, ...styles } })
      }
    : undefined
  const styleValue = (key: keyof BlockStyles): string =>
    (block?.styles?.[key] as string) ?? ""

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Add layout block
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Click a preset to add an empty grid to the canvas. You can drag it to reorder.
        </p>
        <div className="flex flex-col gap-2">
          {LAYOUT_OPTIONS.map((cols) => (
            <DraggableLayoutPreset
              key={cols}
              cols={cols}
              disabled={disabled}
              isSelected={hoveringCols === cols}
              onAdd={() => onAddLayoutBlock?.(cols)}
              onMouseEnter={() => setHoveringCols(cols)}
              onMouseLeave={() => setHoveringCols(null)}
              renderPreview={renderPreview}
            >
            </DraggableLayoutPreset>
          ))}
        </div>
      </div>

      {block?.type === "grid" && updateStyles && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Grid styles
          </h3>
          <div className="flex flex-col gap-3">
            <label className={fieldClass}>
              <span className="text-sm font-medium">Gap</span>
              <input
                type="text"
                value={styleValue("gap")}
                onChange={(e) => updateStyles({ gap: e.target.value || undefined })}
                disabled={disabled}
                placeholder="e.g. 8px"
                className={inputClass}
              />
            </label>
            <label className={fieldClass}>
              <span className="text-sm font-medium">Padding</span>
              <input
                type="text"
                value={styleValue("padding")}
                onChange={(e) => updateStyles({ padding: e.target.value || undefined })}
                disabled={disabled}
                placeholder="e.g. 16px"
                className={inputClass}
              />
            </label>
            <label className={fieldClass}>
              <span className="text-sm font-medium">Background color</span>
              <input
                type="text"
                value={styleValue("backgroundColor")}
                onChange={(e) =>
                  updateStyles({ backgroundColor: e.target.value || undefined })
                }
                disabled={disabled}
                placeholder="e.g. #f5f5f5"
                className={inputClass}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export default LayoutInspector
