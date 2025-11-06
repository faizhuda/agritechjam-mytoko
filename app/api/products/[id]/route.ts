import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// PATCH /api/products/[id]
// Allows admins to update limited product fields safely.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Prefer bearer token from client (avoids reliance on server cookies in dev/Turbopack)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader : null

  const supabase = bearer
    ? createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: bearer } } })
    : createServerClient(supabaseUrl, supabaseAnon, {
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

  // Require auth
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Require admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Read body first (so we can also accept id in body as fallback)
  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  // Determine product id from path or body
  const { id: idParam } = params
  let id = Number.parseInt(String(idParam ?? "").trim(), 10)
  if (!Number.isFinite(id) || id <= 0) {
    const bodyId = Number.parseInt(String(body?.id ?? "").trim(), 10)
    if (Number.isFinite(bodyId) && bodyId > 0) {
      id = bodyId
    } else {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 })
    }
  }

  // Whitelist and validate fields
  const allow: any = {}
  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (name.length === 0 || name.length > 120) return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    allow.name = name
  }
  if (typeof body.description === "string") {
    const short = body.description
    if (short.length > 500) return NextResponse.json({ error: "Description too long" }, { status: 400 })
    allow.description = short
  }
  if (typeof body.long_description === "string") {
    const desc = body.long_description
    if (desc.length > 5000) return NextResponse.json({ error: "Long description too long" }, { status: 400 })
    allow.long_description = desc
  }
  if (Array.isArray(body.features)) {
    const arr = body.features
      .map((x: any) => (typeof x === "string" ? x.trim() : ""))
      .filter((x: string) => x.length > 0)
      .slice(0, 50)
    allow.features = arr
  }
  if (typeof body.category === "string") {
    const cat = body.category.trim()
    if (cat.length === 0 || cat.length > 120) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }
    allow.category = cat
  }
  if (body.stock != null) {
    const n = Number(body.stock)
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return NextResponse.json({ error: "Invalid stock" }, { status: 400 })
    allow.stock = Math.floor(n)
  }
  if (typeof body.image === "string") {
    const u = body.image
    if (!/^https?:\/\//i.test(u)) return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
    allow.image = u
  }

  // Protect DB-managed columns
  delete allow.in_stock
  delete allow.original_price
  delete allow.price // price edits not allowed via this route
  delete allow.rating
  delete allow.reviews

  if (Object.keys(allow).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 })

  const { data, error } = await supabase
    .from("products")
    .update(allow)
    .eq("id", id)
    .select("id, name, price, original_price, category, rating, reviews, image, description, long_description, features, stock, in_stock")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ product: data })
}
