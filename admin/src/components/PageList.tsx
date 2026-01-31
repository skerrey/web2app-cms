import type { Page } from "../types"

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
  onMovePage: (index: number, direction: -1 | 1) => void
  disabled?: boolean
}

const PageList = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onMovePage,
  disabled = false
}: PageListProps) => {
  const handleAdd = () => {
    const title = window.prompt("Page title?", "New Page")
    if (title == null || title.trim() === "") return
    const existingIds = pages.map((p) => p.id)
    const baseId = slugFromTitle(title.trim())
    const id = ensureUniqueId(baseId, existingIds)
    const route = pages.length === 0 ? "/" : `/${id}`
    const newPage: Page = {
      id,
      title: title.trim(),
      route,
      blocks: []
    }
    onAddPage(newPage)
  }

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete page "${title}"?`)) return
    onDeletePage(id)
  }

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span className="page-list-title">Pages</span>
        <button
          type="button"
          className="page-list-add"
          onClick={handleAdd}
          disabled={disabled}
          aria-label="Add page"
        >
          Add page
        </button>
      </div>
      <ul className="page-list-items" role="list">
        {pages.map((page, index) => (
          <li key={page.id} className="page-list-item">
            <button
              type="button"
              className={`page-list-item-button ${selectedPageId === page.id ? "is-selected" : ""}`}
              onClick={() => onSelectPage(page.id)}
              disabled={disabled}
              aria-pressed={selectedPageId === page.id}
            >
              {page.title}
            </button>
            <div className="page-list-item-actions">
              <button
                type="button"
                className="page-list-move"
                onClick={() => onMovePage(index, -1)}
                disabled={disabled || index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="page-list-move"
                onClick={() => onMovePage(index, 1)}
                disabled={disabled || index === pages.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="page-list-delete"
                onClick={() => handleDelete(page.id, page.title)}
                disabled={disabled}
                aria-label={`Delete ${page.title}`}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PageList
