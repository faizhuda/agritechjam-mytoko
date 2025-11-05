import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient as createJsClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client for Route Handlers that supports either:
// - Bearer token from the client (Authorization header)
// - SSR cookies fallback
export function createRouteClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader : null
  if (bearer) {
    return createJsClient(url, anon, { global: { headers: { Authorization: bearer } } })
  }
  return createServerClient(url, anon, {
    cookies: {
      async get(name) {
        const store = await cookies()
        return store.get(name)?.value
      },
      async set(name, value, options) {
        const store = await cookies()
        store.set({ name, value, ...options })
      },
      async remove(name, options) {
        const store = await cookies()
        store.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })
}
