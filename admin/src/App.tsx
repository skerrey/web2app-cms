import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragCancelEvent,
  type DragEndEvent
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import {
  loadManifest,
  loadContent,
  normalizeContent,
  normalizeManifest,
  validateManifest,
  validateContent,
  buildContentForPublish,
  buildManifestForPublish,
  createGridBlock,
  createBlock
} from "./lib/json"
import type { Manifest, Page, Block, GridBlockData } from "./types"
import PageList from "./components/PageList"
import BlockLibrary from "./components/BlockLibrary"
import BlockCanvas from "./components/BlockCanvas"
import CanvasDropZone, { getCanvasDropId } from "./components/CanvasDropZone"
import type { EditorMode } from "./types"
import Inspector from "./components/Inspector/index"
import PreviewPhone, {
  PREVIEW_DEVICE_OPTIONS,
  type PreviewDeviceId
} from "./components/PreviewPhone"
import { useScrollTopShadow } from "./utils/useScrollTopShadow"
import { MdSmartphone } from "react-icons/md";

type LoadStatus = "idle" | "loading" | "loaded" | "error"

const reorderPagesByManifest = (pages: Page[], pagesOrder: string[]): Page[] => {
  const byId = new Map(pages.map((p) => [p.id, p]))
  const ordered: Page[] = []
  for (const id of pagesOrder) {
    const p = byId.get(id)
    if (p) ordered.push(p)
  }
  for (const p of pages) {
    if (!pagesOrder.includes(p.id)) ordered.push(p)
  }
  return ordered
}

/** Find a block by id in top-level blocks or inside grid cells */
const findBlockInBlocks = (blocks: Block[], blockId: string | null): Block | null => {
  if (blockId == null) return null
  const top = blocks.find((b) => b.id === blockId)
  if (top) return top
  for (const b of blocks) {
    if (b.type === "grid") {
      const data = b.data as GridBlockData
      for (const cell of data.cells ?? []) {
        const found = cell.blocks.find((nb) => nb.id === blockId)
        if (found) return found
      }
    }
  }
  return null
}

/** Find which grid cell contains a block id. Returns grid id, cell id, and index in that cell. */
const findCellContainingBlockId = (
  blocks: Block[],
  blockId: string
): { gridBlockId: string; cellId: string; index: number } | null => {
  for (const b of blocks) {
    if (b.type === "grid") {
      const data = b.data as GridBlockData
      for (const cell of data.cells ?? []) {
        const index = cell.blocks.findIndex((nb) => nb.id === blockId)
        if (index !== -1) return { gridBlockId: b.id, cellId: cell.id, index }
      }
    }
  }
  return null
}

const removeBlockFromBlocks = (blocks: Block[], blockId: string): { blocks: Block[]; removed: boolean } => {
  let removed = false
  const nextTop = blocks
    .filter((b) => {
      const keep = b.id !== blockId
      if (!keep) removed = true
      return keep
    })
    .map((b) => {
      if (b.type !== "grid") return b
      const data = b.data as GridBlockData
      const nextCells = (data.cells ?? []).map((cell) => {
        const nextNested = cell.blocks.filter((nb) => {
          const keep = nb.id !== blockId
          if (!keep) removed = true
          return keep
        })
        return nextNested === cell.blocks ? cell : { ...cell, blocks: nextNested }
      })
      return { ...b, data: { ...data, cells: nextCells } }
    })
  return { blocks: nextTop, removed }
}

const App = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [activeDrag, setActiveDrag] = useState<
    | {
        id: string
        type?: string
        blockType?: "text" | "hero" | "button" | "image"
        columns?: number
        pageId?: string
        blockId?: string
        gridBlockId?: string
        cellId?: string
      }
    | null
  >(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>("edit")
  const [reloadKey, setReloadKey] = useState(0)
  const [previewDevice, setPreviewDevice] = useState<PreviewDeviceId>("google-pixel-6-pro")

  const canvasScrollRef = useRef<HTMLDivElement | null>(null)
  const layoutScrollRef = useRef<HTMLDivElement | null>(null)
  const { showShadow: showCanvasShadow } = useScrollTopShadow(canvasScrollRef)
  const { showShadow: showLayoutShadow } = useScrollTopShadow(layoutScrollRef)

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (editorMode !== "layout") return
      const target = e.target as HTMLElement
      if (!target) return
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      if (!isInput) return
      const inCanvas = canvasScrollRef.current?.contains(target)
      const inInspector = layoutScrollRef.current?.contains(target)
      if (inCanvas || inInspector) setEditorMode("edit")
    }
    document.addEventListener("focusin", onFocusIn)
    return () => document.removeEventListener("focusin", onFocusIn)
  }, [editorMode])

  useEffect(() => {
    return () => {
      setIsPublishing(false)
    }
  }, [setIsPublishing])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadStatus("loading")
      setLoadError(null)
      try {
        const [rawManifest, rawContent] = await Promise.all([
          loadManifest(),
          loadContent()
        ])
        if (cancelled) return
        const normManifest = normalizeManifest(rawManifest)
        const manifestErr = validateManifest(normManifest)
        if (manifestErr) {
          setLoadError(manifestErr)
          setLoadStatus("error")
          return
        }
        const normPages = normalizeContent(rawContent)
        const contentErr = validateContent(normPages)
        if (contentErr) {
          setLoadError(contentErr)
          setLoadStatus("error")
          return
        }
        const ordered = reorderPagesByManifest(normPages, normManifest.pagesOrder)
        setManifest(normManifest)
        setPages(ordered)
        setSelectedPageId(ordered[0]?.id ?? null)
        setSelectedBlockId(null)
        setIsDirty(false)
        setLoadStatus("loaded")
        setLoadError(null)
        setPublishStatus(null)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Failed to load")
        setLoadStatus("error")
        setManifest(null)
        setPages([])
        setSelectedPageId(null)
        setSelectedBlockId(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const statusMessage =
    publishStatus != null
      ? publishStatus
      : loadStatus === "loading"
        ? "Loading content..."
        : loadStatus === "loaded"
          ? `Loaded content.json and manifest.json (${pages.length} pages)`
          : loadStatus === "error"
            ? loadError ?? "Error"
            : ""

  const SUCCESS_MESSAGE =
    "Success, new changes are published, please allow ~5min for the changes to take affect in the app"

  const handlePublish = async () => {
    if (isPublishing || !isDirty || !manifest || pages.length === 0) return
    const pagesOrder = pages.map((p) => p.id)
    const manifestPayload = buildManifestForPublish(manifest, pagesOrder)
    const contentPayload = buildContentForPublish(pages)
    const manifestErr = validateManifest(manifestPayload)
    if (manifestErr) {
      setPublishStatus(manifestErr)
      return
    }
    const contentErr = validateContent(pages)
    if (contentErr) {
      setPublishStatus(contentErr)
      return
    }
    setIsPublishing(true)
    setPublishStatus("Publishing to GitHub...")
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifest: manifestPayload,
          content: contentPayload
        })
      })
      const body = await response.json().catch(() => ({}))
      if (response.ok && body.ok === true) {
        setPublishStatus(SUCCESS_MESSAGE)
        setIsDirty(false)
      } else {
        setPublishStatus(body.error ?? "Publish failed")
      }
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleAddPage = (page: Page) => {
    setPages((prev) => [...prev, page])
    setManifest((prev) =>
      prev ? { ...prev, pagesOrder: [...prev.pagesOrder, page.id] } : null
    )
    setSelectedPageId(page.id)
    setIsDirty(true)
  }

  const handleUpdatePage = (pageId: string, updates: Partial<Pick<Page, "title">>) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...updates } : p)))
    setIsDirty(true)
  }

  const handleUpdatePageTitle = (id: string, title: string) => {
    handleUpdatePage(id, { title })
  }

  const handleDeletePage = (id: string) => {
    const nextPages = pages.filter((p) => p.id !== id)
    setPages(nextPages)
    setManifest((m) =>
      m ? { ...m, pagesOrder: nextPages.map((p) => p.id) } : null
    )
    setSelectedPageId((sid) => (sid === id ? nextPages[0]?.id ?? null : sid))
    setIsDirty(true)
  }

  const handleReorderPages = (nextPages: Page[]) => {
    setPages(nextPages)
    setManifest((m) =>
      m ? { ...m, pagesOrder: nextPages.map((p) => p.id) } : null
    )
    setIsDirty(true)
  }

  const currentPage = pages.find((p) => p.id === selectedPageId) ?? null
  const currentBlocks = currentPage?.blocks ?? []

  const handleAddBlock = (block: Block) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPageId
          ? { ...p, blocks: [...p.blocks, block] }
          : p
      )
    )
    setSelectedBlockId(block.id)
    setIsDirty(true)
  }

  const handleAddLayoutBlock = (columns: number) => {
    if (!selectedPageId) return
    const block = createGridBlock(columns)
    handleAddBlock(block)
    setEditorMode("layout")
  }

  const handleReorderBlocks = (newBlocks: Block[]) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPageId ? { ...p, blocks: newBlocks } : p
      )
    )
    setIsDirty(true)
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        const res = removeBlockFromBlocks(p.blocks, blockId)
        return res.removed ? { ...p, blocks: res.blocks } : p
      })
    )
    setSelectedBlockId((sid) => (sid === blockId ? null : sid))
    setIsDirty(true)
  }

  const handleAddBlockToCell = (gridBlockId: string, cellId: string, block: Block) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        return {
          ...p,
          blocks: p.blocks.map((b) => {
            if (b.id !== gridBlockId || b.type !== "grid") return b
            const data = b.data as { columns: number; cells: { id: string; blocks: Block[] }[] }
            return {
              ...b,
              data: {
                ...data,
                cells: data.cells.map((cell) =>
                  cell.id === cellId
                    ? { ...cell, blocks: [...cell.blocks, block] }
                    : cell
                )
              }
            }
          })
        }
      })
    )
    setSelectedBlockId(block.id)
    setIsDirty(true)
  }

  const handleReorderBlocksInCell = (gridBlockId: string, cellId: string, newBlocks: Block[]) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        return {
          ...p,
          blocks: p.blocks.map((b) => {
            if (b.id !== gridBlockId || b.type !== "grid") return b
            const data = b.data as GridBlockData
            return {
              ...b,
              data: {
                ...data,
                cells: (data.cells ?? []).map((cell) =>
                  cell.id === cellId ? { ...cell, blocks: newBlocks } : cell
                )
              }
            }
          })
        }
      })
    )
    setIsDirty(true)
  }

  const handleAdjustGridSpans = (blockId: string, cellIndex: number, newSpan: number) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        return {
          ...p,
          blocks: p.blocks.map((b) => {
            if (b.id !== blockId || b.type !== "grid") return b
            const data = b.data as GridBlockData
            const cells = data.cells ?? []
            if (cellIndex < 0 || cellIndex >= cells.length - 1) return b
            const cellA = cells[cellIndex]
            const cellB = cells[cellIndex + 1]
            if (cellA == null || cellB == null) return b
            const spanA = cellA.span ?? 1
            const spanB = cellB.span ?? 1
            const total = spanA + spanB
            const clamped = Math.min(total - 1, Math.max(1, newSpan))
            const nextSpan = total - clamped
            return {
              ...b,
              data: {
                ...data,
                cells: cells.map((cell, i) => {
                  if (i === cellIndex) return { ...cell, span: clamped }
                  if (i === cellIndex + 1) return { ...cell, span: nextSpan }
                  return cell
                })
              }
            }
          })
        }
      })
    )
    setIsDirty(true)
  }

  const handleMoveNestedBlock = (
    blockId: string,
    fromGridId: string,
    fromCellId: string,
    toGridId: string,
    toCellId: string,
    insertAtIndex?: number
  ) => {
    if (!selectedPageId) return
    if (fromGridId === toGridId && fromCellId === toCellId) return
    const gridBlock = currentPage?.blocks.find((b) => b.id === fromGridId && b.type === "grid")
    const gridData = gridBlock?.data as GridBlockData | undefined
    const fromCell = gridData?.cells?.find((c) => c.id === fromCellId)
    const blockToMove = fromCell?.blocks.find((nb) => nb.id === blockId)
    if (!blockToMove) return

    const insertAt = (targetBlocks: Block[]): Block[] => {
      if (insertAtIndex != null && insertAtIndex >= 0 && insertAtIndex <= targetBlocks.length) {
        return [...targetBlocks.slice(0, insertAtIndex), blockToMove, ...targetBlocks.slice(insertAtIndex)]
      }
      return [...targetBlocks, blockToMove]
    }

    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        return {
          ...p,
          blocks: p.blocks.map((b) => {
            if (b.type !== "grid") return b
            const data = b.data as GridBlockData
            const cells = data.cells ?? []
            if (b.id === fromGridId) {
              const cellsWithout = cells.map((c) =>
                c.id === fromCellId
                  ? { ...c, blocks: c.blocks.filter((nb) => nb.id !== blockId) }
                  : c
              )
              if (fromGridId === toGridId) {
                const toCell = cellsWithout.find((c) => c.id === toCellId)
                const cellsWith = cellsWithout.map((c) =>
                  c.id === toCellId ? { ...c, blocks: insertAt(toCell?.blocks ?? []) } : c
                )
                return { ...b, data: { ...data, cells: cellsWith } }
              }
              return { ...b, data: { ...data, cells: cellsWithout } }
            }
            if (b.id === toGridId) {
              const toCell = cells.find((c) => c.id === toCellId)
              const cellsWith = cells.map((c) =>
                c.id === toCellId ? { ...c, blocks: insertAt(toCell?.blocks ?? []) } : c
              )
              return { ...b, data: { ...data, cells: cellsWith } }
            }
            return b
          })
        }
      })
    )
    setIsDirty(true)
  }

  const selectedBlock = findBlockInBlocks(
    currentPage?.blocks ?? [],
    selectedBlockId
  )

  const handleUpdateBlock = (updatedBlock: Block) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        return {
          ...p,
          blocks: p.blocks.map((b) => {
            if (b.id === updatedBlock.id) return updatedBlock
            if (b.type === "grid") {
              const data = b.data as GridBlockData
              const cells = (data.cells ?? []).map((cell) => ({
                ...cell,
                blocks: cell.blocks.map((nb) =>
                  nb.id === updatedBlock.id ? updatedBlock : nb
                )
              }))
              return { ...b, data: { ...data, cells } }
            }
            return b
          })
        }
      })
    )
    setIsDirty(true)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; blockType?: "text" | "hero" | "button" | "image"; columns?: number; pageId?: string }
      | undefined
    setActiveDrag({ id: String(event.active.id), ...data })
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDrag(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDrag(null)
    if (over == null) return

    const activeData = active.data.current as
      | {
          type?: string
          columns?: number
          blockType?: "text" | "hero" | "button" | "image"
          pageId?: string
          blockId?: string
          gridBlockId?: string
          cellId?: string
        }
      | undefined
    const overId = String(over.id)

    if (activeData?.type === "page" && typeof activeData.pageId === "string" && overId.startsWith("page-")) {
      const overPageId = overId.slice(5)
      const oldIndex = pages.findIndex((p) => p.id === activeData.pageId)
      const newIndex = pages.findIndex((p) => p.id === overPageId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        handleReorderPages(arrayMove(pages, oldIndex, newIndex))
      }
      return
    }

    if (activeData?.type === "layout-preset" && overId === getCanvasDropId()) {
      if (typeof activeData.columns === "number") {
        handleAddLayoutBlock(activeData.columns)
      }
      return
    }

    if (activeData?.type === "content-block" && overId.startsWith("cell-")) {
      const parts = overId.slice(5).split("__")
      const gridBlockId = parts[0]
      const cellId = parts[1]
      if (gridBlockId != null && cellId != null) {
        const blockType = activeData.blockType
        if (blockType === "text" || blockType === "hero" || blockType === "button" || blockType === "image") {
          const block = createBlock(blockType)
          handleAddBlockToCell(gridBlockId, cellId, block)
        }
      }
      return
    }

    if (
      activeData?.type === "nested-block" &&
      typeof activeData.gridBlockId === "string" &&
      typeof activeData.cellId === "string" &&
      typeof activeData.blockId === "string"
    ) {
      const fromGridId = activeData.gridBlockId
      const fromCellId = activeData.cellId
      const blockId = activeData.blockId

      if (overId.startsWith("cell-")) {
        const parts = overId.slice(5).split("__")
        const toGridId = parts[0]
        const toCellId = parts[1]
        if (toGridId != null && toCellId != null) {
          handleMoveNestedBlock(blockId, fromGridId, fromCellId, toGridId, toCellId)
        }
        return
      }

      const gridBlock = currentBlocks.find((b) => b.id === fromGridId && b.type === "grid")
      const gridData = gridBlock?.data as GridBlockData | undefined
      const fromCell = gridData?.cells?.find((c) => c.id === fromCellId)

      if (fromCell && overId !== active.id) {
        const inSameCell = fromCell.blocks.some((b) => b.id === over.id)
        if (inSameCell) {
          const oldIndex = fromCell.blocks.findIndex((b) => b.id === active.id)
          const newIndex = fromCell.blocks.findIndex((b) => b.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            handleReorderBlocksInCell(fromGridId, fromCellId, arrayMove(fromCell.blocks, oldIndex, newIndex))
          }
          return
        }
      }

      const toCellInfo = findCellContainingBlockId(currentPage?.blocks ?? [], overId)
      if (toCellInfo) {
        const { gridBlockId: toGridId, cellId: toCellId, index } = toCellInfo
        if (fromGridId !== toGridId || fromCellId !== toCellId) {
          handleMoveNestedBlock(blockId, fromGridId, fromCellId, toGridId, toCellId, index)
        }
      }
      return
    }

    const oldIndex = currentBlocks.findIndex((b) => b.id === active.id)
    const newIndex = currentBlocks.findIndex((b) => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1 && active.id !== over.id) {
      handleReorderBlocks(arrayMove(currentBlocks, oldIndex, newIndex))
    }
  }

  const dragOverlay = () => {
    if (!activeDrag) return null
    if (activeDrag.type === "content-block" && activeDrag.blockType) {
      const label =
        activeDrag.blockType === "text"
          ? "Text"
          : activeDrag.blockType === "hero"
            ? "Hero"
            : activeDrag.blockType === "image"
              ? "Image"
              : "Button"
      return (
        <div className="px-3 py-2 text-sm rounded border border-gray-400 bg-white shadow-lg opacity-95">
          {label}
        </div>
      )
    }
    if (activeDrag.type === "nested-block") {
      const block = findBlockInBlocks(currentPage?.blocks ?? [], activeDrag.blockId ?? null)
      const label = block
        ? block.type.charAt(0).toUpperCase() + block.type.slice(1)
        : "Block"
      return (
        <div className="px-3 py-2 text-sm rounded border border-gray-400 bg-white shadow-lg opacity-95">
          {label}
        </div>
      )
    }
    if (activeDrag.type === "layout-preset" && typeof activeDrag.columns === "number") {
      return (
        <div className="px-3 py-2 text-sm rounded border border-gray-400 bg-white shadow-lg opacity-95">
          {activeDrag.columns} column layout
        </div>
      )
    }
    if (activeDrag.type === "page" && typeof activeDrag.pageId === "string") {
      const title = pages.find((p) => p.id === activeDrag.pageId)?.title ?? "Page"
      return (
        <div className="px-2 py-1.5 text-sm rounded border border-gray-300 bg-white shadow-lg opacity-95 max-w-[220px] truncate">
          {title}
        </div>
      )
    }
    return (
      <div className="px-3 py-2 text-sm rounded border border-gray-300 bg-white shadow-lg opacity-95">
        Dragging…
      </div>
    )
  }

  return (
    <main className="max-w-full mx-0 p-6">
      <div className="flex justify-between items-end">
        <header>
          <h1 className="m-0 mb-2 text-2xl font-semibold">Web2App CMS Admin</h1>
          <p className="m-0 text-gray-600">Block-based visual editor. (Sidebar, canvas, inspector + preview coming next.)</p>
        </header>
        <div className="">
          <div className="flex justify-end gap-3 mb-1">
            <button
              type="button"
              className="px-3 py-2 border border-gray-400 bg-white cursor-pointer rounded disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loadStatus === "loading" || isPublishing}
              aria-label="Reload content"
            >
              Reload
            </button>
            <button
              type="button"
              id="publishButton"
              className="px-3 py-2 border border-gray-400 bg-white cursor-pointer rounded disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!isDirty || isPublishing}
              onClick={handlePublish}
              aria-label="Publish changes"
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </button>
          </div>
          <div id="status" className="text-sm text-gray-600" aria-live="polite">
            {statusMessage}
          </div>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <DragOverlay dropAnimation={null}>
          {dragOverlay()}
        </DragOverlay>
        <section
          className="grid gap-4 mt-4 overflow-hidden min-h-[400px] h-[calc(100vh-180px)]"
          style={{ gridTemplateColumns: "240px 1fr 280px 400px" }}
          data-manifest-version={manifest?.schemaVersion}
          data-selected-page={selectedPageId ?? undefined}
          data-selected-block={selectedBlockId ?? undefined}
          data-dirty={isDirty}
          data-publishing={isPublishing}
        >
          <div className="bg-white border border-gray-200 p-4 rounded min-h-0 overflow-y-auto">
            <PageList
              pages={pages}
              selectedPageId={selectedPageId}
              onSelectPage={(id) => {
                setSelectedPageId(id)
                setSelectedBlockId(null)
              }}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onUpdatePageTitle={handleUpdatePageTitle}
              disabled={loadStatus !== "loaded"}
            />
          </div>
          <div 
            ref={canvasScrollRef}
            className="bg-white border border-gray-200 rounded min-h-0 overflow-y-auto"
          >
            <CanvasDropZone isLayoutMode={editorMode === "layout"}>
              <BlockLibrary
                onAddBlock={handleAddBlock}
                disabled={loadStatus !== "loaded" || !selectedPageId}
                mode={editorMode}
                className={`sticky top-0 z-10 bg-white w-full h-full p-4 border-b border-gray-200 ${showCanvasShadow ? "shadow-lg" : ""}`}
              />
              <BlockCanvas
                blocks={currentBlocks}
                selectedBlockId={selectedBlockId}
                mode={editorMode}
                onSelectBlock={setSelectedBlockId}
                onReorderBlocks={handleReorderBlocks}
                onUpdateBlock={handleUpdateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAdjustGridSpans={handleAdjustGridSpans}
                disabled={loadStatus !== "loaded" || !selectedPageId}
              />
            </CanvasDropZone>
          </div>
        <div 
          ref={layoutScrollRef}
          className="bg-white border border-gray-200 rounded min-h-0 overflow-y-auto min-w-0"
        >
          <Inspector
            key={selectedBlockId ?? "no-block"}
            block={selectedBlock}
            mode={editorMode}
            onChangeMode={setEditorMode}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            pages={pages}
            disabled={loadStatus !== "loaded" || !selectedPageId}
            onAddLayoutBlock={handleAddLayoutBlock}
            className={`sticky top-0 z-10 bg-white w-full`}
            titleClassName={`p-4 w ${showLayoutShadow ? "shadow-lg" : ""}`}
          />
        </div>
        <div
          className="bg-white border border-gray-200 rounded min-h-0 overflow-y-auto overflow-x-hidden min-w-0 flex flex-col p-2"
          style={{ containerType: "inline-size" }}
        >
          <label className="sr-only" htmlFor="preview-device-select">
            Preview device
          </label>
          <div className="flex gap-[5px]">
            <MdSmartphone size={20} className="text-blue-600 mt-[9px]" />
            <select
              id="preview-device-select"
              value={previewDevice}
              onChange={(e) => setPreviewDevice(e.target.value as PreviewDeviceId)}
              className="mb-3 w-full max-w-[240px] rounded border border-gray-300 bg-white p-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PREVIEW_DEVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <PreviewPhone
            blocks={currentBlocks}
            device={previewDevice}
          />
        </div>
        </section>
      </DndContext>
    </main>
  )
}

export default App
