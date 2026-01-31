import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Block } from "../types"
import { getBlockComponent } from "../blocks"

export type EditorMode = "edit" | "layout"

export interface BlockCanvasProps {
  blocks: Block[]
  selectedBlockId: string | null
  mode: EditorMode
  onSelectBlock: (id: string | null) => void
  onReorderBlocks?: (blocks: Block[]) => void
  disabled?: boolean
}

interface SortableBlockRowProps {
  block: Block
  isSelected: boolean
  mode: EditorMode
  onSelectBlock: (id: string | null) => void
  disabled: boolean
}

const SortableBlockRow = ({
  block,
  isSelected,
  mode,
  onSelectBlock,
  disabled
}: SortableBlockRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const BlockComponent = getBlockComponent(block.type)

  return (
    <div
      ref={setNodeRef}
      className={`block-canvas-item ${isSelected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""}`}
      data-block-id={block.id}
      style={style}
    >
      {mode === "layout" && (
        <div
          ref={setActivatorNodeRef}
          className="block-canvas-handle"
          aria-label="Drag handle"
          {...attributes}
          {...listeners}
        >
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
}

const BlockCanvas = ({
  blocks,
  selectedBlockId,
  mode,
  onSelectBlock,
  onReorderBlocks,
  disabled = false
}: BlockCanvasProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderBlocks) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(blocks, oldIndex, newIndex)
    onReorderBlocks(reordered)
  }

  const listContent =
    blocks.length === 0 ? (
      <p className="block-canvas-empty">
        No blocks. Add one from the library above.
      </p>
    ) : mode === "layout" && onReorderBlocks ? (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="block-canvas-list">
            {blocks.map((block) => (
              <SortableBlockRow
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                mode={mode}
                onSelectBlock={onSelectBlock}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    ) : (
      <div className="block-canvas-list">
        {blocks.map((block) => (
          <SortableBlockRow
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            mode={mode}
            onSelectBlock={onSelectBlock}
            disabled={disabled}
          />
        ))}
      </div>
    )

  return <div className="block-canvas">{listContent}</div>
}

export default BlockCanvas
