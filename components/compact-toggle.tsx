"use client"

import { useEffect, useState } from "react"

export default function CompactToggle() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ui-density")
      const isCompact = saved === "compact"
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      className="fixed bottom-4 left-4 z-50 bg-white border-2 border-black px-3 py-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black uppercase text-black hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      {compact ? "Density: Compact" : "Density: Default"}
    </button>
  )
}
