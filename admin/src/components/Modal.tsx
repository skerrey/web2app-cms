import { useEffect, useRef } from "react"

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  primaryLabel?: string
  onPrimary?: () => void
  cancelLabel?: string
  onCancel?: () => void
  /** If true, clicking the overlay calls onClose. Default true. */
  closeOnOverlayClick?: boolean
  /** If true, Escape key calls onClose. Default true. */
  closeOnEscape?: boolean
}

const Modal = ({
  open,
  onClose,
  title,
  children,
  primaryLabel,
  onPrimary,
  cancelLabel = "Cancel",
  onCancel,
  closeOnOverlayClick = true,
  closeOnEscape = true
}: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousActiveRef.current = document.activeElement as HTMLElement | null
    return () => {
      previousActiveRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, closeOnEscape, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick) return
    if (e.target === overlayRef.current) onClose()
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    else onClose()
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {title != null && (
          <h2 id="modal-title" className="text-lg font-semibold p-4 pb-0">
            {title}
          </h2>
        )}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {(primaryLabel != null || cancelLabel != null) && (
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
            {cancelLabel != null && (
              <button
                type="button"
                className="px-3 py-2 text-sm rounded border border-gray-400 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={handleCancel}
              >
                {cancelLabel}
              </button>
            )}
            {primaryLabel != null && (
              <button
                type="button"
                className="px-3 py-2 text-sm rounded border border-primary bg-primary text-white hover:bg-primary-hover cursor-pointer"
                onClick={onPrimary}
              >
                {primaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
