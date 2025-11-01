"use client"

import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export const supabaseBrowser = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
})()

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey)
