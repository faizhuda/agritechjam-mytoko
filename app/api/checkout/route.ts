import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: NextRequest) {
  // Create a Supabase server client that can read auth cookies
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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const items: Array<{ productId: number; quantity: number }> = body?.items ?? []
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items" }, { status: 400 })
  }

  const payload = items.map((i) => ({ product_id: i.productId, quantity: i.quantity }))
  const { data, error } = await supabase.rpc("create_order_and_decrement_stock", {
    p_items: payload,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  // Prefer the order_number stored in DB; fallback to derived format
  let orderNumber: string | null = null
  try {
    const { data: ord } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", data)
      .maybeSingle()
    orderNumber = (ord as any)?.order_number ?? null
  } catch {}

  if (!orderNumber) {
    // Friendly order number: MTK-YYYYMMDD-XXXXXXXX (first 8 of UUID)
    const idStr = String(data || "")
    const short = idStr.replace(/-/g, "").slice(0, 8).toUpperCase()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    orderNumber = `MTK-${y}${m}${d}-${short}`
  }

  return NextResponse.json({ orderId: data, orderNumber })
}
