import type { Block } from "../types"
import { getBlockComponent } from "../blocks"

const PHONE_WIDTH = 375

export interface PreviewPhoneProps {
  pageTitle?: string
  blocks: Block[]
  className?: string
}

const PreviewPhone = ({
  pageTitle,
  blocks,
  className = ""
}: PreviewPhoneProps) => {
  return (
    <div className={`preview-phone ${className}`.trim()} style={{ width: PHONE_WIDTH }}>
      <div className="preview-phone-frame">
        {pageTitle != null && pageTitle !== "" && (
          <div className="preview-phone-header">{pageTitle}</div>
        )}
        <div className="preview-phone-content">
          {blocks.length === 0 ? (
            <p className="preview-phone-empty">No blocks on this page.</p>
          ) : (
            blocks.map((block) => {
              const BlockComponent = getBlockComponent(block.type)
              return BlockComponent ? (
                <div key={block.id} className="preview-phone-block">
                  <BlockComponent data={block.data} styles={block.styles} />
                </div>
              ) : (
                <div key={block.id} className="preview-phone-block preview-phone-unknown">
                  Unknown: {block.type}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default PreviewPhone
