"use client"

import { MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"

// Floating WhatsApp button for mobile users
// Appears on small screens only; links to owner's WhatsApp with prefilled message including current URL
export default function WhatsAppFloat() {
  const [href, setHref] = useState("https://wa.me/6287787128257")

  useEffect(() => {
    if (typeof window === "undefined") return
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent("Halo Admin, saya mau tanya tentang produk ini. (MyToko)")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(`https://wa.me/6287787128257?text=${text}%20%7C%20URL%3A%20${url}`)
  }, [])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="md:hidden fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 px-4 py-3 bg-green-400 text-black border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
      aria-label="Chat via WhatsApp"
    >
      <MessageCircle size={20} className="stroke-[2.5]" />
      <span>WhatsApp</span>
    </a>
  )
}
