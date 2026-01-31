import type { Block } from "../types"
import { createBlock } from "../lib/json"

export interface BlockLibraryProps {
  onAddBlock: (block: Block) => void
  disabled?: boolean
}

const BLOCK_TYPES: Array<{ type: Block["type"]; label: string }> = [
  { type: "text", label: "Text" },
  { type: "hero", label: "Hero" },
  { type: "button", label: "Button" }
]

const BlockLibrary = ({ onAddBlock, disabled = false }: BlockLibraryProps) => {
  return (
    <div className="block-library">
      <span className="block-library-title">Block Library</span>
      <div className="block-library-buttons">
        {BLOCK_TYPES.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="block-library-btn"
            onClick={() => onAddBlock(createBlock(type))}
            disabled={disabled}
            aria-label={`Add ${label} block`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BlockLibrary
