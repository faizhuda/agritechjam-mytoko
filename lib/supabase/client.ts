import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

// Create a singleton client for use in the browser/client components
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy object to avoid crashes when envs are missing
    // You can detect with `isSupabaseConfigured()`
    return null as unknown as ReturnType<typeof createClient>
  }
  return createClient(supabaseUrl, supabaseAnonKey)
})()

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey)
