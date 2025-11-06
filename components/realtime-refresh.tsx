"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"

/**
 * Subscribes to Postgres changes and triggers router.refresh() with a debounce.
 * Useful to auto-refresh Server Components (Home, Catalog) when products change.
 */
export default function RealtimeRefresh({ table = "products" }: { table?: string }) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const ch = supabase
      .channel(`refresh-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          try { router.refresh() } catch {}
        }, 250)
      })
      .subscribe()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      try { ch.unsubscribe() } catch {}
    }
  }, [table, router])

  return null
}
