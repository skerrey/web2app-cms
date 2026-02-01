import { useLayoutEffect, useState } from "react"

export function useFitScale(
  ref: React.RefObject<HTMLElement>,
  baseWidth: number,
  paddingPx = 16
) {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      const available = Math.max(0, w - paddingPx)
      const nextScale = baseWidth > 0 ? Math.min(1, available / baseWidth) : 1
      setScale(nextScale)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => ro.disconnect()
  }, [ref, baseWidth, paddingPx])

  return scale
}
