"use client"

import { useEffect, useState, useCallback } from "react"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      setUser(null)
      return
    }

    let mounted = true

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!mounted) return
      setUser(data.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      session: Session | null
    ) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) throw new Error("Supabase env not configured")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) throw new Error("Supabase env not configured")
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [])

  const signInWithGoogle = useCallback(async (opts?: { redirectTo?: string }) => {
    if (!isSupabaseConfigured()) throw new Error("Supabase env not configured")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          opts?.redirectTo ?? (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined),
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    await supabase.auth.signOut()
  }, [])

  return { user, loading, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut }
}
