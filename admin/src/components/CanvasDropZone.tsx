import { useDroppable } from "@dnd-kit/core"

const CANVAS_DROP_ID = "canvas-drop"

export interface CanvasDropZoneProps {
  children: React.ReactNode
  isLayoutMode?: boolean
}

export const getCanvasDropId = () => CANVAS_DROP_ID

const CanvasDropZone = ({ children, isLayoutMode = false }: CanvasDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] flex flex-col ${isOver && isLayoutMode ? "ring-2 ring-primary bg-primary-light/20 rounded" : ""}`}
    >
      {children}
    </div>
  )
}

export default CanvasDropZone
