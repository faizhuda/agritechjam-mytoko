import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// PATCH /api/products/[id]
// Allows admins to update limited product fields safely.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = new NextResponse()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    }
  )

  // Require auth
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Require admin
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Whitelist and validate fields
  const allow: any = {}
  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (name.length === 0 || name.length > 120) return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    allow.name = name
  }
  if (typeof body.long_description === "string") {
    const desc = body.long_description
    if (desc.length > 5000) return NextResponse.json({ error: "Description too long" }, { status: 400 })
    allow.long_description = desc
  }
  if (typeof body.category === "string") {
    const cat = body.category.toLowerCase()
    const ok = ["electronics", "accessories"].includes(cat)
    if (!ok) return NextResponse.json({ error: "Invalid category" }, { status: 400 })
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
