"use client"

import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export const supabaseBrowser = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Enable hash-based auth flow (for email links)
      flowType: 'pkce',
      // Auto-detect and process hash fragments
      detectSessionInUrl: true,
      // Storage for session persistence
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
})()

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey)
