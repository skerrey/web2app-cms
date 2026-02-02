import { useState } from "react"
import type { Block, BlockData, BlockStyles, GridBlockData, Page } from "../../types"
import { HiOutlineTrash } from "react-icons/hi2"
import Modal from "../Modal"

const TEXT_ALIGN_OPTIONS: Array<{ value: BlockStyles["textAlign"]; label: string }> = [
  { value: "left", label: "Left (default)" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
]

const CONTENT_ALIGN_OPTIONS: Array<{ value: BlockStyles["contentAlign"]; label: string }> = [
  { value: "left", label: "Left (default)" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
]

const OBJECT_FIT_OPTIONS: Array<{ value: BlockStyles["objectFit"]; label: string }> = [
  { value: "cover", label: "Cover (default)" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "none", label: "None" },
  { value: "scale-down", label: "Scale down" }
]

const STYLE_CONFIG: Array<{ key: keyof BlockStyles; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> }> = [
  { key: "width", label: "Width", placeholder: "e.g. 100%" },
  { key: "height", label: "Height", placeholder: "e.g. 200px or auto" },
  { key: "color", label: "Color", placeholder: "e.g. #333" },
  { key: "textAlign", label: "Text align", options: TEXT_ALIGN_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label })) },
  { key: "contentAlign", label: "Content align", options: CONTENT_ALIGN_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label })) },
  { key: "fontSize", label: "Font size", placeholder: "e.g. 16px" },
  { key: "backgroundColor", label: "Background color", placeholder: "e.g. #f5f5f5 or blue" },
  { key: "borderRadius", label: "Border radius", placeholder: "e.g. 8px or 50%" },
  { key: "objectFit", label: "Object fit", options: OBJECT_FIT_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label })) }
]

const SPACING_SIDES = [
  { allKey: "padding" as const, keys: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const, label: "Padding" },
  { allKey: "margin" as const, keys: ["marginTop", "marginRight", "marginBottom", "marginLeft"] as const, label: "Margin" }
] as const

type DataFieldConfig =
  | { key: string; label: string; inputType?: "text" }
  | { key: string; label: string; inputType: "textarea" }
  | { key: string; label: string; inputType: "select"; options: Array<{ value: string; label: string }> }

const TEXT_DATA_CONFIG: DataFieldConfig[] = [
  { key: "text", label: "Text", inputType: "textarea" }
]
const HERO_DATA_CONFIG: DataFieldConfig[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "imageUrl", label: "Image URL" }
]
const BUTTON_DATA_CONFIG = (pages: Page[]): DataFieldConfig[] => [
  { key: "label", label: "Label" },
  {
    key: "url",
    label: "Page",
    inputType: "select",
    options: [
      { value: "", label: "(none)" },
      ...pages
        .filter((p) => typeof p.route === "string" && p.route.trim() !== "")
        .map((p) => ({ value: String(p.route), label: `${p.title} (${String(p.route)})` }))
    ]
  }
]

const IMAGE_DATA_CONFIG: DataFieldConfig[] = [
  { key: "imageUrl", label: "Image URL" },
  { key: "alt", label: "Alt text" }
]

export interface EditInspectorProps {
  block: Block
  onUpdateBlock: (block: Block) => void
  onDeleteBlock?: (blockId: string) => void
  pages?: Page[]
  disabled?: boolean
}

const inputClass =
  "w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
const fieldClass = "flex flex-col gap-1"

/** Display value for padding/margin: strip "px" so user sees "25" not "25px". */
const spacingDisplayValue = (val: string): string =>
  val.endsWith("px") ? val.slice(0, -2) : val

/** Normalize input to stored value: "25" -> "25px", "auto" -> "auto". */
const spacingStoredValue = (input: string): string | undefined => {
  const t = input.trim()
  if (t === "") return undefined
  if (/^[\d.]+$/.test(t)) return t + "px"
  return t
}

interface SpacingInputProps {
  value: string
  onChange: (value: string | undefined) => void
  placeholder: string
  disabled?: boolean
}

const SpacingInput = ({ value, onChange, placeholder, disabled = false }: SpacingInputProps) => (
  <div className="flex mt-1 rounded overflow-hidden border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
    <input
      type="text"
      value={spacingDisplayValue(value)}
      onChange={(e) => onChange(spacingStoredValue(e.target.value))}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 min-w-0 px-2 py-1.5 text-sm border-0 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
    />
    <span
      className="inline-flex items-center px-2 py-1.5 text-sm text-gray-500 bg-gray-100 border-l border-gray-300 shrink-0"
      aria-hidden
    >
      px
    </span>
  </div>
)

interface ContentInputProps {
  config: DataFieldConfig
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const ContentInput = ({ config, value, onChange, disabled = false }: ContentInputProps) => (
  <label className={fieldClass}>
    <span className="text-sm font-medium">{config.label}</span>
    {config.inputType === "textarea" ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className={inputClass}
      />
    ) : config.inputType === "select" && "options" in config ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputClass}
      >
        {config.options.map((opt) => (
          <option key={opt.value || "none"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputClass}
      />
    )}
  </label>
)

interface StyleInputRowProps {
  config: (typeof STYLE_CONFIG)[number]
  value: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
}

const StyleInputRow = ({ config, value, onChange, disabled = false }: StyleInputRowProps) => (
  <label className={fieldClass}>
    <span className="text-sm font-medium">{config.label}</span>
    {config.options ? (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        className={inputClass}
      >
        {config.options.map((opt) => (
          <option key={opt.value || "default"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : config.key === "fontSize" ? (
      <SpacingInput
        value={value}
        onChange={onChange}
        placeholder="16"
        disabled={disabled}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        placeholder={config.placeholder}
        className={inputClass}
      />
    )}
  </label>
)

const EditInspector = ({ block, onUpdateBlock, onDeleteBlock, pages = [], disabled = false }: EditInspectorProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const updateData = (data: BlockData) => {
    onUpdateBlock({ ...block, data: { ...block.data, ...data } })
  }

  const updateStyles = (styles: BlockStyles) => {
    onUpdateBlock({ ...block, styles: { ...block.styles, ...styles } })
  }

  const styleValue = (key: keyof BlockStyles): string =>
    (block.styles?.[key] as string) ?? ""

  const data = block.data ?? {}
  const dataValue = (key: string): string =>
    (key in data && data[key as keyof typeof data] != null
      ? String(data[key as keyof typeof data])
      : "")

  const dataConfigByType: Record<Block["type"], DataFieldConfig[]> = {
    text: TEXT_DATA_CONFIG,
    hero: HERO_DATA_CONFIG,
    button: BUTTON_DATA_CONFIG(pages),
    image: IMAGE_DATA_CONFIG,
    grid: []
  }
  const currentDataConfig = dataConfigByType[block.type]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      updateData({ ...data, imageUrl: dataUrl } as BlockData)
    }
    reader.readAsDataURL(file)
  }

  const getRelevantStyles = (): typeof STYLE_CONFIG => {
    const type = block.type
    const textStyleKeys: (keyof BlockStyles)[] = ["width", "height", "color", "textAlign", "fontSize", "backgroundColor"]
    const heroButtonStyleKeys: (keyof BlockStyles)[] = ["width", "height", "color", "textAlign", "contentAlign", "fontSize", "backgroundColor"]
    const imageStyleKeys: (keyof BlockStyles)[] = ["width", "height", "contentAlign", "backgroundColor", "borderRadius", "objectFit"]
    const gridStyleKeys: (keyof BlockStyles)[] = ["width", "backgroundColor"]
    
    if (type === "text") {
      return STYLE_CONFIG.filter((s) => (textStyleKeys as string[]).includes(s.key as string))
    }
    if (type === "hero" || type === "button") {
      return STYLE_CONFIG.filter((s) => (heroButtonStyleKeys as string[]).includes(s.key as string))
    }
    if (type === "image") {
      return STYLE_CONFIG.filter((s) => (imageStyleKeys as string[]).includes(s.key as string))
    }
    if (type === "grid") {
      return STYLE_CONFIG.filter((s) => (gridStyleKeys as string[]).includes(s.key as string))
    }
    return STYLE_CONFIG
  }

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Block type</h3>
          <span className="text-base font-medium">{block.type.charAt(0).toUpperCase() + block.type.slice(1)}</span>
        </div>
        {onDeleteBlock != null && (
          <button
            type="button"
            className="p-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            onClick={() => setShowDeleteModal(true)}
            disabled={disabled}
            aria-label={`Delete ${block.type} block`}
          >
            <HiOutlineTrash className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Data</h3>
        <div className="flex flex-col gap-3">
          {currentDataConfig?.map((config: DataFieldConfig) => (
            <ContentInput
              key={config.key}
              config={config}
              value={dataValue(config.key)}
              onChange={(value) => updateData({ ...data, [config.key]: value || undefined } as BlockData)}
              disabled={disabled}
            />
          ))}
          {block.type === "image" && (
            <label className={fieldClass}>
              <span className="text-sm font-medium">Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={disabled}
                className="mt-1 text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-gray-500 mt-1">Upload an image (stored as base64 in JSON)</span>
            </label>
          )}
          {block.type === "grid" && (
            <>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Total columns (grid width)</span>
                <select
                  value={String((block.data as GridBlockData).gridColumns ?? 12)}
                  onChange={(e) => {
                    const newCols = Number(e.target.value)
                    const gridData = block.data as GridBlockData
                    const cells = gridData.cells ?? []
                    const base = Math.floor(newCols / cells.length)
                    const remainder = newCols - base * cells.length
                    const spans = Array.from({ length: cells.length }, (_, i) => base + (i < remainder ? 1 : 0))
                    onUpdateBlock({
                      ...block,
                      data: {
                        ...gridData,
                        gridColumns: newCols,
                        cells: cells.map((c, i) => ({ ...c, span: spans[i] }))
                      }
                    })
                  }}
                  disabled={disabled}
                  className={inputClass}
                >
                  {[6, 12, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} columns
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-gray-500">Use the slider between columns on the canvas to adjust span per cell.</p>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Styles</h3>
        <div className="flex flex-col gap-3">
          {SPACING_SIDES.map(({ allKey, keys, label }) => {
            const allVal = styleValue(allKey)
            const hasAnySide = keys.some((k) => styleValue(k) !== "")
            const placeholderAll = hasAnySide ? "--" : "0"
            const placeholderSide = allVal ? spacingDisplayValue(allVal) : "0"
            return (
              <div key={allKey} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className={fieldClass}>
                    <span className="text-xs text-gray-600">All</span>
                    <SpacingInput
                      value={allVal}
                      onChange={(v) =>
                        updateStyles({
                          [allKey]: v,
                          ...Object.fromEntries(keys.map((k) => [k, undefined]))
                        })
                      }
                      placeholder={placeholderAll}
                      disabled={disabled}
                    />
                  </label>
                  {keys.map((key) => (
                    <label key={key} className={fieldClass}>
                      <span className="text-xs text-gray-600">{key.replace(allKey === "padding" ? "padding" : "margin", "").replace(/^[A-Z]/, (c) => c.toLowerCase())}</span>
                      <SpacingInput
                        value={styleValue(key)}
                        onChange={(v) =>
                          updateStyles({
                            [key]: v,
                            [allKey]: undefined
                          })
                        }
                        placeholder={placeholderSide}
                        disabled={disabled}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
          {getRelevantStyles().map((config) => (
            <StyleInputRow
              key={config.key}
              config={config}
              value={
                config.key === "textAlign" || config.key === "contentAlign"
                  ? (styleValue(config.key) || "left")
                  : config.key === "objectFit"
                  ? (styleValue(config.key) || "cover")
                  : styleValue(config.key)
              }
              onChange={(value) => updateStyles({ [config.key]: value || undefined } as BlockStyles)}
              disabled={disabled}
            />
          ))}
          {block.type === "grid" && (
            <>
              <label className={fieldClass}>
                <span className="text-sm font-medium">Position</span>
                <select
                  value={styleValue("position") || "static"}
                  onChange={(e) =>
                    updateStyles({
                      position: (e.target.value || undefined) as BlockStyles["position"]
                    })
                  }
                  disabled={disabled}
                  className={inputClass}
                >
                  <option value="static">Static (default)</option>
                  <option value="relative">Relative</option>
                  <option value="absolute">Absolute</option>
                  <option value="fixed">Fixed</option>
                  <option value="sticky">Sticky</option>
                </select>
              </label>
              {(styleValue("position") === "sticky" ||
                styleValue("position") === "absolute" ||
                styleValue("position") === "fixed") && (
                <>
                  <label className={fieldClass}>
                    <span className="text-sm font-medium">Top</span>
                    <input
                      type="text"
                      value={styleValue("top")}
                      onChange={(e) => updateStyles({ top: e.target.value || undefined })}
                      disabled={disabled}
                      placeholder="e.g. 0 or auto"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="text-sm font-medium">Right</span>
                    <input
                      type="text"
                      value={styleValue("right")}
                      onChange={(e) => updateStyles({ right: e.target.value || undefined })}
                      disabled={disabled}
                      placeholder="e.g. 0 or auto"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="text-sm font-medium">Bottom</span>
                    <input
                      type="text"
                      value={styleValue("bottom")}
                      onChange={(e) => updateStyles({ bottom: e.target.value || undefined })}
                      disabled={disabled}
                      placeholder="e.g. 0 (stick to bottom)"
                      className={inputClass}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className="text-sm font-medium">Left</span>
                    <input
                      type="text"
                      value={styleValue("left")}
                      onChange={(e) => updateStyles({ left: e.target.value || undefined })}
                      disabled={disabled}
                      placeholder="e.g. 0 or auto"
                      className={inputClass}
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete block?"
        primaryLabel="Delete"
        onPrimary={() => {
          onDeleteBlock?.(block.id)
          setShowDeleteModal(false)
        }}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteModal(false)}
      >
        <p className="text-sm text-gray-600 m-0">
          Are you sure you want to delete this {block.type} block?
        </p>
      </Modal>
    </div>
  )
}

export default EditInspector
