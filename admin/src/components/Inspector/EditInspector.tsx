import type { Block, BlockData, BlockStyles, Page } from "../../types"

const TEXT_ALIGN_OPTIONS: Array<{ value: BlockStyles["textAlign"]; label: string }> = [
  { value: undefined, label: "(default)" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
]

export interface EditInspectorProps {
  block: Block
  onUpdateBlock: (block: Block) => void
  pages?: Page[]
  disabled?: boolean
}

const inputClass =
  "w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
const fieldClass = "flex flex-col gap-1"

const EditInspector = ({ block, onUpdateBlock, pages = [], disabled = false }: EditInspectorProps) => {
  const updateData = (data: BlockData) => {
    onUpdateBlock({ ...block, data: { ...block.data, ...data } })
  }

  const updateStyles = (styles: BlockStyles) => {
    onUpdateBlock({ ...block, styles: { ...block.styles, ...styles } })
  }

  const styleValue = (key: keyof BlockStyles): string =>
    (block.styles?.[key] as string) ?? ""

  const data = block.data ?? {}

  const pagesByRoute = new Map(
    pages
      .filter((p) => typeof p.route === "string" && p.route.trim() !== "")
      .map((p) => [String(p.route), p])
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Block type</h3>
        <span className="text-sm">{block.type}</span>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Data</h3>
        <div className="flex flex-col gap-3">
          {block.type === "text" && (
            <label className={fieldClass}>
              <span className="text-sm font-medium">Text</span>
              <textarea
                value={"text" in data ? String(data.text) : ""}
                onChange={(e) => updateData({ ...data, text: e.target.value } as BlockData)}
                disabled={disabled}
                rows={4}
                className={inputClass}
              />
            </label>
          )}
          {block.type === "hero" && (
            <>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Title</span>
                <input
                  type="text"
                  value={"title" in data ? String(data.title) : ""}
                  onChange={(e) =>
                    updateData({ ...data, title: e.target.value } as BlockData)
                  }
                  disabled={disabled}
                  className={inputClass}
                />
              </label>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Subtitle</span>
                <input
                  type="text"
                  value={"subtitle" in data ? String(data.subtitle ?? "") : ""}
                  onChange={(e) =>
                    updateData({ ...data, subtitle: e.target.value } as BlockData)
                  }
                  disabled={disabled}
                  className={inputClass}
                />
              </label>
            </>
          )}
          {block.type === "button" && (
            <>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Label</span>
                <input
                  type="text"
                  value={"label" in data ? String(data.label) : ""}
                  onChange={(e) =>
                    updateData({ ...data, label: e.target.value } as BlockData)
                  }
                  disabled={disabled}
                  className={inputClass}
                />
              </label>
              <label className={fieldClass}>
                <span className="text-sm font-medium">URL</span>
                <input
                  type="text"
                  value={"url" in data ? String(data.url ?? "") : ""}
                  onChange={(e) =>
                    updateData({ ...data, url: e.target.value } as BlockData)
                  }
                  disabled={disabled}
                  className={inputClass}
                />
              </label>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Page</span>
                <select
                  value={
                    "url" in data && typeof data.url === "string" && pagesByRoute.has(String(data.url))
                      ? String(data.url)
                      : ""
                  }
                  onChange={(e) =>
                    updateData({ ...data, url: e.target.value || undefined } as BlockData)
                  }
                  disabled={disabled}
                  className={inputClass}
                >
                  <option value="">(none)</option>
                  {pages
                    .filter((p) => typeof p.route === "string" && p.route.trim() !== "")
                    .map((p) => (
                      <option key={p.id} value={String(p.route)}>
                        {p.title} ({String(p.route)})
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Styles</h3>
        <div className="flex flex-col gap-3">
          <label className={fieldClass}>
            <span className="text-sm font-medium">Width</span>
            <input
              type="text"
              value={styleValue("width")}
              onChange={(e) => updateStyles({ width: e.target.value || undefined })}
              disabled={disabled}
              placeholder="e.g. 100%"
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
            <span className="text-sm font-medium">Color</span>
            <input
              type="text"
              value={styleValue("color")}
              onChange={(e) => updateStyles({ color: e.target.value || undefined })}
              disabled={disabled}
              placeholder="e.g. #333"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className="text-sm font-medium">Text align</span>
            <select
              value={styleValue("textAlign") || ""}
              onChange={(e) =>
                updateStyles({
                  textAlign: (e.target.value || undefined) as BlockStyles["textAlign"]
                })
              }
              disabled={disabled}
              className={inputClass}
            >
              {TEXT_ALIGN_OPTIONS.map((opt) => (
                <option key={opt.value ?? "default"} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            <span className="text-sm font-medium">Font size</span>
            <input
              type="text"
              value={styleValue("fontSize")}
              onChange={(e) =>
                updateStyles({ fontSize: e.target.value || undefined })
              }
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
    </div>
  )
}

export default EditInspector
