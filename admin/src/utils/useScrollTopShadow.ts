import { useEffect, useState } from "react"

export function useScrollTopShadow(
  ref: React.RefObject<HTMLElement>,
  threshold = 8
) {
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleScroll = () => {
      setAtTop(el.scrollTop <= threshold)
    }

    // initialize on mount
    handleScroll()

    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [ref, threshold])

  return {
    atTop,
    showShadow: !atTop
  }
}
