import type { Block, EditorMode, Page } from "../../types"
import EditInspector from "./EditInspector"
import LayoutInspector from "./LayoutInspector"

export interface InspectorProps {
  block: Block | null
  mode: EditorMode
  onChangeMode?: (mode: EditorMode) => void
  onUpdateBlock: (block: Block) => void
  onDeleteBlock?: (blockId: string) => void
  pages?: Page[]
  disabled?: boolean
  onAddLayoutBlock?: (columns: number) => void
  className?: string
  titleClassName?: string
}

const Inspector = ({
  block,
  mode,
  onChangeMode,
  onUpdateBlock,
  onDeleteBlock,
  pages = [],
  disabled = false,
  onAddLayoutBlock,
  className = "",
  titleClassName = ""
}: InspectorProps) => {
  return (
    <div className={className}>
      <div className={`flex items-center justify-between gap-3 border-b border-gray-200 mb-2 sticky top-0 bg-white ${titleClassName} px-2`}>
        <h3 className="text-lg font-bold">
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Switch to</span>
          {mode === "layout" && (
              <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded border`}
              onClick={() => onChangeMode?.("edit")}

              disabled={disabled}
            >
              Edit
            </button>
          )}
          {mode === "edit" && (
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded border`}
              onClick={() => onChangeMode?.("layout")}

              disabled={disabled}
            >
              Layout
            </button>
          )}
        </div>
      </div>
      <div className="px-2 py-2">
        {mode === "edit" ? (
          block ? (
            <EditInspector
              block={block}
              onUpdateBlock={onUpdateBlock}
              onDeleteBlock={onDeleteBlock}
              pages={pages}
              disabled={disabled}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">Select a block to edit.</p>
            </div>
          )
        ) : mode === "layout" ? (
          <LayoutInspector
            block={block}
            onUpdateBlock={onUpdateBlock}
            disabled={disabled}
            onAddLayoutBlock={onAddLayoutBlock}
          />
        ) : null}
      </div>
    </div>
  )
}

export default Inspector
