import { useDroppable } from "@dnd-kit/core"
import { useState } from "react"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Block, BlockData, GridBlockData } from "../types"
import { getBlockComponent } from "../blocks"
import { HiOutlineBars3, HiOutlineTrash } from "react-icons/hi2"
import { IoCloseCircleOutline } from "react-icons/io5"
import type { EditorMode } from "../types"
import Modal from "./Modal"

export const getCellDropId = (blockId: string, cellId: string) =>
  `cell-${blockId}__${cellId}`

const CellDropZone = ({
  blockId,
  cellId,
  children,
  isLayoutMode,
  isEmpty
}: {
  blockId: string
  cellId: string
  children: React.ReactNode
  isLayoutMode: boolean
  isEmpty: boolean
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: getCellDropId(blockId, cellId)
  })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded border border-dashed border-gray-300 bg-gray-50/50 ${
        isOver && isLayoutMode ? "ring-2 ring-primary bg-primary-light/30 border-primary" : ""
      } ${isEmpty ? "flex items-center justify-center" : ""}`}
    >
      {children}
    </div>
  )
}

export interface BlockCanvasProps {
  blocks: Block[]
  selectedBlockId: string | null
  mode: EditorMode
  onSelectBlock: (id: string | null) => void
  onReorderBlocks: (blocks: Block[]) => void
  onUpdateBlock?: (block: Block) => void
  onDeleteBlock?: (blockId: string) => void
  disabled?: boolean
}

interface SortableBlockRowProps {
  block: Block
  isSelected: boolean
  mode: EditorMode
  onSelect: () => void
  onSelectBlock: (id: string | null) => void
  onUpdateBlock?: (block: Block) => void
  onRequestDeleteBlock?: (blockId: string, blockType: string) => void
  onDeleteBlock?: (blockId: string) => void
  disabled?: boolean
  selectedBlockId: string | null
}

interface SortableNestedBlockRowProps {
  block: Block
  gridBlockId: string
  cellId: string
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onUpdateBlock?: (block: Block) => void
  onDeleteBlock?: (blockId: string) => void
  disabled?: boolean
}

const inputClass =
  "w-full min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed bg-white"

const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.closest("input, textarea, [contenteditable=true]") != null
}

/** Inline editable content for canvas (Edit mode) */
const BlockInlineEditor = ({
  block,
  onUpdateBlock,
  onSelect,
  disabled
}: {
  block: Block
  onUpdateBlock: (block: Block) => void
  onSelect: () => void
  disabled: boolean
}) => {
  const data = block.data ?? {}
  const updateData = (next: BlockData) => {
    onUpdateBlock({ ...block, data: { ...block.data, ...next } })
  }

  if (block.type === "text") {
    return (
      <div
        className="flex-1 min-w-0 flex flex-col"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("textarea") == null) onSelect()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (isTextInputTarget(e.target)) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        <textarea
          rows={4}
          className={`${inputClass} resize-y min-h-[4.5rem]`}
          value={"text" in data ? String(data.text) : ""}
          onChange={(e) => updateData({ ...data, text: e.target.value } as BlockData)}
          onFocus={onSelect}
          disabled={disabled}
          placeholder="(Empty text)"
        />
      </div>
    )
  }

  if (block.type === "hero") {
    return (
      <div
        className="flex-1 min-w-0 flex flex-col gap-2"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("input") == null) onSelect()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (isTextInputTarget(e.target)) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        <input
          type="text"
          className={`${inputClass} font-semibold text-base`}
          value={"title" in data ? String(data.title) : ""}
          onChange={(e) => updateData({ ...data, title: e.target.value } as BlockData)}
          onFocus={onSelect}
          disabled={disabled}
          placeholder="(No title)"
        />
        <input
          type="text"
          className={`${inputClass} text-sm text-gray-600`}
          value={"subtitle" in data ? String(data.subtitle ?? "") : ""}
          onChange={(e) => updateData({ ...data, subtitle: e.target.value } as BlockData)}
          onFocus={onSelect}
          disabled={disabled}
          placeholder="Subtitle"
        />
      </div>
    )
  }

  if (block.type === "button") {
    return (
      <div
        className="flex-1 min-w-0 flex flex-col gap-1.5"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("input") == null) onSelect()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (isTextInputTarget(e.target)) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        <input
          type="text"
          className={`${inputClass} font-medium w-fit max-w-full`}
          value={"label" in data ? String(data.label) : ""}
          onChange={(e) => updateData({ ...data, label: e.target.value } as BlockData)}
          onFocus={onSelect}
          disabled={disabled}
          placeholder="(Button)"
        />
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 text-sm text-gray-500" onClick={onSelect} role="button" tabIndex={0}>
      Unknown: {block.type}
    </div>
  )
}

const SortableNestedBlockRow = ({
  block: b,
  gridBlockId,
  cellId,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  disabled = false
}: SortableNestedBlockRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: b.id,
    data: { type: "nested-block", blockId: b.id, gridBlockId, cellId }
  })
  const C = getBlockComponent(b.type)
  const nestedSelected = selectedBlockId === b.id
  const canInlineEditNested = onUpdateBlock != null && b.type !== "grid"
  const showNestedDelete = b.type !== "grid" && onDeleteBlock != null
  const showNestedDragHandle = b.type !== "grid"

  if (!C) {
    return (
      <span className="text-gray-500 text-xs">
        {b.type}
      </span>
    )
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className={`group/nested relative rounded border p-1.5 ${
        canInlineEditNested ? "" : "text-sm cursor-pointer"
      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
        nestedSelected
          ? "border-primary bg-primary-light"
          : "border-gray-200 bg-white hover:bg-gray-50"
      } ${isDragging ? "opacity-40" : ""}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelectBlock(b.id)
      }}
      onKeyDown={(e) => {
        if (isTextInputTarget(e.target)) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelectBlock(b.id)
        }
      }}
      data-cell-drop
    >
      {showNestedDragHandle && (
        <button
          type="button"
          className="absolute top-[-10px] left-[-10px] z-10 rounded-full text-gray-400 bg-white hover:text-gray-600 hover:bg-gray-50 opacity-0 group-hover/nested:opacity-100 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed p-0.5 border-[1px] border-gray-200 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder or move"
          disabled={disabled}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <HiOutlineBars3 aria-hidden />
        </button>
      )}
      {showNestedDelete && (
        <button
          type="button"
          className="absolute top-[-10px] right-[-10px] z-10 rounded-full p-0.5 text-gray-400 bg-white hover:text-red-600 hover:bg-red-50 opacity-0 group-hover/nested:opacity-100 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteBlock(b.id)
          }}
          disabled={disabled}
          aria-label={`Delete ${b.type} block`}
        >
          <IoCloseCircleOutline className="w-5 h-5" aria-hidden />
        </button>
      )}
      {canInlineEditNested ? (
        <BlockInlineEditor
          block={b}
          onUpdateBlock={onUpdateBlock}
          onSelect={() => onSelectBlock(b.id)}
          disabled={disabled}
        />
      ) : (
        <C data={b.data} styles={b.styles} />
      )}
    </div>
  )
}

const SortableBlockRow = ({
  block,
  isSelected,
  mode,
  onSelect,
  onSelectBlock,
  onUpdateBlock,
  onRequestDeleteBlock,
  onDeleteBlock,
  disabled = false,
  selectedBlockId
}: SortableBlockRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const BlockComponent = getBlockComponent(block.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start p-2 rounded border ${
        isSelected ? "border-primary bg-primary-light" : "border-gray-200 bg-white"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex flex-col gap-2 shrink-0 self-start">
        {/* Drag handle: always on the left for reorder */}
        <button
          type="button"
          className="p-1.5 rounded border border-gray-300 bg-gray-50 cursor-grab active:cursor-grabbing touch-none disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Drag to reorder"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <HiOutlineBars3 className="w-4 h-4 text-gray-600" aria-hidden />
        </button>
        {onRequestDeleteBlock && (
          <button
            type="button"
            className="p-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Delete block"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onRequestDeleteBlock(block.id, block.type)
            }}
          >
            <HiOutlineTrash className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>

      {onUpdateBlock && block.type !== "grid" ? (
        <BlockInlineEditor
          block={block}
          onUpdateBlock={onUpdateBlock}
          onSelect={onSelect}
          disabled={disabled}
        />
      ) : block.type === "grid" ? (
        <div
          className="flex-1 min-w-0 grid gap-2 p-2"
          style={{
            gridTemplateColumns: `repeat(${(block.data as GridBlockData).columns ?? 1}, minmax(0, 1fr))`,
            gap: block.styles?.gap ?? "8px"
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-cell-drop]") != null) return
            e.stopPropagation()
            onSelect()
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (isTextInputTarget(e.target)) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onSelect()
            }
          }}
        >
          {((block.data as GridBlockData).cells ?? []).map((cell) => (
            <CellDropZone
              key={cell.id}
              blockId={block.id}
              cellId={cell.id}
              isLayoutMode={mode === "layout"}
              isEmpty={cell.blocks.length === 0}
            >
              {cell.blocks.length === 0 ? (
                <span className="text-xs text-gray-400" data-cell-drop>
                  {mode === "layout" ? "Drop block here" : "Empty"}
                </span>
              ) : (
                <SortableContext
                  items={cell.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1" data-cell-drop>
                    {cell.blocks.map((b) => (
                      <SortableNestedBlockRow
                        key={b.id}
                        block={b}
                        gridBlockId={block.id}
                        cellId={cell.id}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={onSelectBlock}
                        onUpdateBlock={onUpdateBlock}
                        onDeleteBlock={onDeleteBlock}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </CellDropZone>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="flex-1 min-w-0 text-left rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset disabled:pointer-events-none"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          disabled={disabled}
        >
          {BlockComponent ? (
            <BlockComponent data={block.data} styles={block.styles} />
          ) : (
            <span className="text-gray-500">Unknown: {block.type}</span>
          )}
        </button>
      )}
    </div>
  )
}

const BlockCanvas = ({
  blocks,
  selectedBlockId,
  mode,
  onSelectBlock,
  onReorderBlocks: _onReorderBlocks,
  onUpdateBlock,
  onDeleteBlock,
  disabled = false
}: BlockCanvasProps) => {
  const [blockToDelete, setBlockToDelete] = useState<{ id: string; type: string } | null>(null)
  return (
    <>
      <div className="mt-3 flex flex-col gap-2">
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No blocks. Add one from Block Library or drag a layout preset from the Inspector.</p>
        ) : (
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {blocks.map((block) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  mode={mode}
                  onSelect={() => onSelectBlock(block.id)}
                  onSelectBlock={onSelectBlock}
                  onUpdateBlock={onUpdateBlock}
                  onRequestDeleteBlock={
                    onDeleteBlock
                      ? (id, type) => setBlockToDelete({ id, type })
                      : undefined
                  }
                  onDeleteBlock={onDeleteBlock}
                  disabled={disabled}
                  selectedBlockId={selectedBlockId}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
      <Modal
        open={blockToDelete !== null}
        onClose={() => setBlockToDelete(null)}
        title="Delete block?"
        primaryLabel="Delete"
        onPrimary={() => {
          if (!onDeleteBlock || !blockToDelete) return
          onDeleteBlock(blockToDelete.id)
          setBlockToDelete(null)
        }}
        cancelLabel="Cancel"
        onCancel={() => setBlockToDelete(null)}
      >
        {blockToDelete && (
          <p className="text-sm text-gray-600 m-0">
            Are you sure you want to delete this {blockToDelete.type} block?
          </p>
        )}
      </Modal>
    </>
  )
}

export default BlockCanvas
