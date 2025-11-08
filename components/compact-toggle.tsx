"use client"

import { useEffect, useState } from "react"

export default function CompactToggle() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ui-density")
      const isCompact = saved === "compact"
      setCompact(isCompact)
      if (isCompact) document.documentElement.classList.add("compact")
    } catch (e) {
      // ignore
    }
  }, [])

  const toggle = () => {
    const next = !compact
    setCompact(next)
    try {
      if (next) {
        document.documentElement.classList.add("compact")
        localStorage.setItem("ui-density", "compact")
      } else {
        document.documentElement.classList.remove("compact")
        localStorage.setItem("ui-density", "default")
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle compact UI density"
      className="fixed bottom-4 left-4 z-50 bg-background/90 text-foreground border border-border px-3 py-2 rounded-md shadow-sm text-sm hover:brightness-95"
    >
      {compact ? "Compact: On" : "Compact: Off"}
    </button>
  )
}
