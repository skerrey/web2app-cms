import { useRef } from "react"
import { useFitScale } from "../utils/useFitScale"
import type { Block } from "../types"
import { getBlockComponent } from "../blocks"

/** Device IDs matching Devices.css class names (devices.css by Yan Zhu / picturepan2) */
export type PreviewDeviceId =
  | "google-pixel-6-pro"
  | "google-pixel-2-xl"
  | "google-pixel"
  | "galaxy-s8"

export const PREVIEW_DEVICE_OPTIONS: { value: PreviewDeviceId; label: string }[] = [
  { value: "google-pixel-6-pro", label: "Google Pixel 6 Pro" },
  { value: "google-pixel-2-xl", label: "Google Pixel 2 XL" },
  { value: "google-pixel", label: "Google Pixel" },
  { value: "galaxy-s8", label: "Samsung Galaxy S8" }
]

const DEVICE_WIDTHS: Record<PreviewDeviceId, number> = {
  "google-pixel-6-pro": 404,
  "google-pixel-2-xl": 411,
  "google-pixel": 360,
  "galaxy-s8": 360
}

export interface PreviewPhoneProps {
  pageTitle?: string
  blocks: Block[]
  device?: PreviewDeviceId
  className?: string
}

const PreviewPhone = ({
  pageTitle,
  blocks,
  device = "google-pixel-6-pro",
  className = ""
}: PreviewPhoneProps) => {
  const deviceWidth = DEVICE_WIDTHS[device]

    const fitRef = useRef<HTMLDivElement | null>(null)

    // 16px accounts for px-2 left + right (8 + 8)
    const scale = useFitScale(fitRef, deviceWidth, 16)

  const screenContent = (
    <div className="flex flex-col min-h-full bg-white">
      {pageTitle != null && pageTitle !== "" && (
        <div className="px-4 py-3 text-sm font-semibold border-b border-gray-200 bg-gray-50 shrink-0">
          {pageTitle}
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
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
  )

  return (
    <div 
      className={`w-full flex flex-col items-center px-2 -ml-2 ${className}`.trim()}
    >
      {/* Devices.css structure - pure CSS device frames by Yan Zhu (picturepan2) */}
      <div ref={fitRef}
        className="relative flex justify-center w-full"
        style={{
          ["--device-scale" as string]: scale
        }}
      >
        <div
          style={{
            width: deviceWidth,
            maxWidth: deviceWidth,
            transform: "scale(var(--device-scale))",
            transformOrigin: "top center"
          }}
        >
          <div
            className={`device device-${device}`}
          >
            <div className="device-frame">
              <div
                className="device-screen bg-white overflow-hidden"
                style={{ display: "flex", flexDirection: "column", maxWidth: "100%" }}
              >
                {screenContent}
              </div>
            </div>
            <div className="device-stripe" />
            <div className="device-header" />
            <div className="device-sensors" />
            <div className="device-btns" />
            <div className="device-power" />
          </div>
        </div>
      </div>
      <p className=" text-xs text-gray-500 text-center">
        Device frames by{" "}
        <a
          href="https://github.com/picturepan2/devices.css"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          Devices.css
        </a>{" "}
        by Yan Zhu
      </p>
    </div>
  )
}

export default PreviewPhone
