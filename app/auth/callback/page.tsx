"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    // Supabase sets the session via URL hash; once parsed internally, navigate
    const t = setTimeout(() => {
      let redirect = "/"
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          redirect = url.searchParams.get("redirect") || "/"
        }
      } catch {}
      router.replace(redirect)
    }, 300)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-black font-bold">Signing you in…</p>
    </div>
  )
}
