import { useDraggable } from "@dnd-kit/core"
import type { Block } from "../types"
import type { EditorMode } from "../types"
import { createBlock } from "../lib/json"

export interface BlockLibraryProps {
  onAddBlock: (block: Block) => void
  disabled?: boolean
  mode?: EditorMode
  className?: string
}

const BLOCK_TYPES: Array<{ type: "text" | "hero" | "button" | "image"; label: string }> = [
  { type: "text", label: "Text" },
  { type: "hero", label: "Hero" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" }
]

const DraggableBlockButton = ({
  type,
  label,
  disabled,
  onAdd
}: {
  type: "text" | "hero" | "button" | "image"
  label: string
  disabled: boolean
  onAdd: () => void
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `content-block-${type}`,
    data: { type: "content-block", blockType: type }
  })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <button
        type="button"
        className={`px-3 py-2 text-sm rounded border border-gray-400 bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing disabled:opacity-60 disabled:cursor-not-allowed ${isDragging ? "opacity-50" : ""}`}
        onClick={(e) => {
          e.stopPropagation()
          if (isDragging) return
          onAdd()
        }}
        disabled={disabled}
        aria-label={`Add ${label} block (or drag to a layout cell)`}
      >
        {label}
      </button>
    </div>
  )
}

const BlockLibrary = ({ onAddBlock, disabled = false, className = "" }: BlockLibraryProps) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-medium">Block Library</span>
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map(({ type, label }) => (
          <DraggableBlockButton
            key={type}
            type={type}
            label={label}
            disabled={disabled}
            onAdd={() => onAddBlock(createBlock(type))}
          />
        ))}
      </div>
    </div>
  )
}

export default BlockLibrary
