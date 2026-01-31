import { useState } from "react"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Page } from "../types"
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBars3 } from "react-icons/hi2"
import Modal from "./Modal"

const slugFromTitle = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return base || "page"
}

const ensureUniqueId = (id: string, existingIds: string[]): string => {
  if (!existingIds.includes(id)) return id
  let n = 2
  while (existingIds.includes(`${id}-${n}`)) n++
  return `${id}-${n}`
}

export interface PageListProps {
  pages: Page[]
  selectedPageId: string | null
  onSelectPage: (id: string) => void
  onAddPage: (page: Page) => void
  onDeletePage: (id: string) => void
  onUpdatePageTitle: (id: string, title: string) => void
  disabled?: boolean
}

const getPageSortId = (pageId: string) => `page-${pageId}`

const SortablePageRow = ({
  page,
  isSelected,
  disabled,
  onSelect,
  onUpdateTitle,
  onDelete
}: {
  page: Page
  isSelected: boolean
  disabled: boolean
  onSelect: () => void
  onUpdateTitle: (title: string) => void
  onDelete: () => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: getPageSortId(page.id),
    data: { type: "page", pageId: page.id }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        className="p-1.5 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        aria-label="Drag to reorder page"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <HiOutlineBars3 className="w-4 h-4 text-gray-600" aria-hidden />
      </button>
      <div
        className={`flex-1 min-w-0 px-2 py-1.5 text-sm rounded border ${
          isSelected
            ? "border-primary bg-primary-light"
            : "border-gray-200 bg-white hover:bg-gray-50"
        } disabled:opacity-60 disabled:cursor-not-allowed`}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect()
        }}
        aria-pressed={isSelected}
      >
        <input
          type="text"
          className={`w-full bg-transparent outline-none ${
            isSelected ? "text-primary" : "text-gray-900"
          }`}
          value={page.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={onSelect}
          disabled={disabled}
          aria-label="Page title"
        />
      </div>
      <button
        type="button"
        className="p-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete ${page.title}`}
      >
        <HiOutlineTrash className="w-4 h-4" aria-hidden />
      </button>
    </li>
  )
}

const PageList = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onUpdatePageTitle,
  disabled = false
}: PageListProps) => {
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null)

  const handleAdd = () => {
    const title = "New Page"
    const existingIds = pages.map((p) => p.id)
    const baseId = slugFromTitle(title)
    const id = ensureUniqueId(baseId, existingIds)
    const route = pages.length === 0 ? "/" : `/${id}`
    const newPage: Page = {
      id,
      title,
      route,
      blocks: []
    }
    onAddPage(newPage)
  }

  const openDeleteModal = (id: string, title: string) => {
    setPageToDelete({ id, title })
  }

  const confirmDelete = () => {
    if (pageToDelete) {
      onDeletePage(pageToDelete.id)
      setPageToDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Pages</span>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded border border-gray-400 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleAdd}
          disabled={disabled}
          aria-label="Add page"
        >
          <HiOutlinePlus className="w-4 h-4" aria-hidden />
          <span>Add page</span>
        </button>
      </div>
      <SortableContext
        items={pages.map((p) => getPageSortId(p.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="list-none m-0 p-0 flex flex-col gap-1" role="list">
          {pages.map((page) => (
            <SortablePageRow
              key={page.id}
              page={page}
              isSelected={selectedPageId === page.id}
              disabled={disabled}
              onSelect={() => onSelectPage(page.id)}
              onUpdateTitle={(title) => onUpdatePageTitle(page.id, title)}
              onDelete={() => openDeleteModal(page.id, page.title)}
            />
          ))}
        </ul>
      </SortableContext>
      <Modal
        open={pageToDelete !== null}
        onClose={() => setPageToDelete(null)}
        title="Delete page?"
        primaryLabel="Delete"
        onPrimary={confirmDelete}
        cancelLabel="Cancel"
        onCancel={() => setPageToDelete(null)}
      >
        {pageToDelete && (
          <p className="text-sm text-gray-600 m-0">
            Are you sure you want to delete &quot;{pageToDelete.title}&quot;?
          </p>
        )}
      </Modal>
    </div>
  )
}

export default PageList
