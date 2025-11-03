import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(
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

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const client = serviceKey ? createServiceClient(url, serviceKey) : supabase

  // Fetch order
  const { data: order, error: orderErr } = await client
    .from("orders")
    .select("id, order_number, user_id, total, status, created_at")
    .eq("id", id)
    .maybeSingle()
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 400 })
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch items with product names
  const { data: items, error: itemsErr } = await client
    .from("order_items")
    .select("product_id, quantity, price, products:product_id(name)")
    .eq("order_id", id)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

  // Fetch customer profile
  const { data: cust } = await client
    .from("profiles")
    .select("first_name, last_name, full_name, phone, address, city, zip_code, email")
    .eq("id", order.user_id)
    .maybeSingle()

  return NextResponse.json({ order, items, customer: cust || null })
}
