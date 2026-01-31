import type { Block, BlockStyles, BlockData } from "../types"

const TEXT_ALIGN_OPTIONS: Array<{ value: BlockStyles["textAlign"]; label: string }> = [
  { value: undefined, label: "(default)" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
]

export interface InspectorProps {
  block: Block | null
  onUpdateBlock: (block: Block) => void
  disabled?: boolean
}

const Inspector = ({ block, onUpdateBlock, disabled = false }: InspectorProps) => {
  if (!block) {
    return (
      <div className="inspector">
        <p className="inspector-empty">Select a block to edit.</p>
      </div>
    )
  }

  const updateData = (data: BlockData) => {
    onUpdateBlock({ ...block, data })
  }

  const updateStyles = (styles: BlockStyles) => {
    onUpdateBlock({ ...block, styles: { ...block.styles, ...styles } })
  }

  const styleValue = (key: keyof BlockStyles): string =>
    (block.styles?.[key] as string) ?? ""

  return (
    <div className="inspector">
      <div className="inspector-section">
        <h3 className="inspector-heading">Block type</h3>
        <span className="inspector-type">{block.type}</span>
      </div>

      <div className="inspector-section">
        <h3 className="inspector-heading">Data</h3>
        {block.type === "text" && "text" in block.data && (
          <label className="inspector-field">
            <span className="inspector-label">Text</span>
            <textarea
              value={block.data.text}
              onChange={(e) => updateData({ ...block.data, text: e.target.value })}
              disabled={disabled}
              rows={4}
              className="inspector-input"
            />
          </label>
        )}
        {block.type === "hero" && "title" in block.data && (
          <>
            <label className="inspector-field">
              <span className="inspector-label">Title</span>
              <input
                type="text"
                value={block.data.title}
                onChange={(e) =>
                  updateData({ ...block.data, title: e.target.value })
                }
                disabled={disabled}
                className="inspector-input"
              />
            </label>
            <label className="inspector-field">
              <span className="inspector-label">Subtitle</span>
              <input
                type="text"
                value={block.data.subtitle ?? ""}
                onChange={(e) =>
                  updateData({ ...block.data, subtitle: e.target.value })
                }
                disabled={disabled}
                className="inspector-input"
              />
            </label>
          </>
        )}
        {block.type === "button" && "label" in block.data && (
          <>
            <label className="inspector-field">
              <span className="inspector-label">Label</span>
              <input
                type="text"
                value={block.data.label}
                onChange={(e) =>
                  updateData({ ...block.data, label: e.target.value })
                }
                disabled={disabled}
                className="inspector-input"
              />
            </label>
            <label className="inspector-field">
              <span className="inspector-label">URL</span>
              <input
                type="text"
                value={block.data.url ?? ""}
                onChange={(e) =>
                  updateData({ ...block.data, url: e.target.value })
                }
                disabled={disabled}
                className="inspector-input"
              />
            </label>
          </>
        )}
      </div>

      <div className="inspector-section">
        <h3 className="inspector-heading">Styles</h3>
        <label className="inspector-field">
          <span className="inspector-label">Width</span>
          <input
            type="text"
            value={styleValue("width")}
            onChange={(e) => updateStyles({ width: e.target.value || undefined })}
            disabled={disabled}
            placeholder="e.g. 100%"
            className="inspector-input"
          />
        </label>
        <label className="inspector-field">
          <span className="inspector-label">Padding</span>
          <input
            type="text"
            value={styleValue("padding")}
            onChange={(e) => updateStyles({ padding: e.target.value || undefined })}
            disabled={disabled}
            placeholder="e.g. 16px"
            className="inspector-input"
          />
        </label>
        <label className="inspector-field">
          <span className="inspector-label">Color</span>
          <input
            type="text"
            value={styleValue("color")}
            onChange={(e) => updateStyles({ color: e.target.value || undefined })}
            disabled={disabled}
            placeholder="e.g. #333"
            className="inspector-input"
          />
        </label>
        <label className="inspector-field">
          <span className="inspector-label">Text align</span>
          <select
            value={styleValue("textAlign") || ""}
            onChange={(e) =>
              updateStyles({
                textAlign: (e.target.value || undefined) as BlockStyles["textAlign"]
              })
            }
            disabled={disabled}
            className="inspector-input"
          >
            {TEXT_ALIGN_OPTIONS.map((opt) => (
              <option key={opt.value ?? "default"} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inspector-field">
          <span className="inspector-label">Font size</span>
          <input
            type="text"
            value={styleValue("fontSize")}
            onChange={(e) =>
              updateStyles({ fontSize: e.target.value || undefined })
            }
            disabled={disabled}
            placeholder="e.g. 16px"
            className="inspector-input"
          />
        </label>
        <label className="inspector-field">
          <span className="inspector-label">Background color</span>
          <input
            type="text"
            value={styleValue("backgroundColor")}
            onChange={(e) =>
              updateStyles({ backgroundColor: e.target.value || undefined })
            }
            disabled={disabled}
            placeholder="e.g. #f5f5f5"
            className="inspector-input"
          />
        </label>
      </div>
    </div>
  )
}

export default Inspector
