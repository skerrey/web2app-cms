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
    <div
      className={`shrink-0 border border-gray-300 rounded-2xl bg-white overflow-hidden shadow-lg ${className}`.trim()}
      style={{ width: PHONE_WIDTH }}
    >
      <div className="flex flex-col min-h-[400px]">
        {pageTitle != null && pageTitle !== "" && (
          <div className="px-4 py-3 text-sm font-semibold border-b border-gray-200 bg-gray-50">
            {pageTitle}
          </div>
        )}
        <div className="flex-1 p-4 overflow-y-auto">
          {blocks.length === 0 ? (
            <p className="text-sm text-gray-500">No blocks on this page.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {blocks.map((block) => {
                const BlockComponent = getBlockComponent(block.type)
                return BlockComponent ? (
                  <div key={block.id} className="rounded border border-gray-100 p-2">
                    <BlockComponent data={block.data} styles={block.styles} />
                  </div>
                ) : (
                  <div key={block.id} className="rounded border border-gray-200 p-2 text-sm text-gray-500">
                    Unknown: {block.type}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreviewPhone
