import type { Block, BlockData, BlockStyles, Page } from "../../types"

const TEXT_ALIGN_OPTIONS: Array<{ value: BlockStyles["textAlign"]; label: string }> = [
  { value: undefined, label: "(default)" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
]

const STYLE_CONFIG: Array<{ key: keyof BlockStyles; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> }> = [
  { key: "width", label: "Width", placeholder: "e.g. 100%" },
  { key: "padding", label: "Padding", placeholder: "e.g. 16px" },
  { key: "color", label: "Color", placeholder: "e.g. #333" },
  { key: "textAlign", label: "Text align", options: TEXT_ALIGN_OPTIONS.map((o) => ({ value: o.value ?? "", label: o.label })) },
  { key: "fontSize", label: "Font size", placeholder: "e.g. 16px" },
  { key: "backgroundColor", label: "Background color", placeholder: "e.g. #f5f5f5 or blue" }
]

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

export interface EditInspectorProps {
  block: Block
  onUpdateBlock: (block: Block) => void
  pages?: Page[]
  disabled?: boolean
}

const inputClass =
  "w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
const fieldClass = "flex flex-col gap-1"

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
  const dataValue = (key: string): string =>
    (key in data && data[key as keyof typeof data] != null
      ? String(data[key as keyof typeof data])
      : "")

  const dataConfigByType: Record<Block["type"], DataFieldConfig[]> = {
    text: TEXT_DATA_CONFIG,
    hero: HERO_DATA_CONFIG,
    button: BUTTON_DATA_CONFIG(pages),
    grid: []
  }
  const currentDataConfig = dataConfigByType[block.type]

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Block type</h3>
        <span className="text-base font-medium">{block.type.charAt(0).toUpperCase() + block.type.slice(1)}</span>
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
          {block.type === "grid" && (
            <p className="text-sm text-gray-500">Grid layout is edited in the layout panel.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Styles</h3>
        <div className="flex flex-col gap-3">
          {STYLE_CONFIG.map((config) => (
            <StyleInputRow
              key={config.key}
              config={config}
              value={styleValue(config.key)}
              onChange={(value) => updateStyles({ [config.key]: value } as BlockStyles)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default EditInspector
