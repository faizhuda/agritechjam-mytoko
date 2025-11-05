import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

type OrderRow = {
  id: string
  user_id: string
  total: number
  status: string
  created_at: string
}

export async function GET(req: NextRequest) {
  // Authenticated user via cookies or bearer token (for admin check)
  const supabase = createRouteClient(req)

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Prefer service role for broad read under strict RLS, if available
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const client = serviceKey
    ? createServiceClient(url, serviceKey)
    : supabase

  const { data: orders, error } = await client
    .from("orders")
    .select("id, user_id, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const ords: OrderRow[] = (orders || []).map((o: any) => ({
    id: String(o.id),
    user_id: String(o.user_id),
    total: Number(o.total ?? 0),
    status: String(o.status ?? "pending"),
    created_at: o.created_at,
  }))

  // Enrich with customer names
  const userIds = Array.from(new Set(ords.map((o) => o.user_id)))
  let names = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: pf } = await client
      .from("profiles")
      .select("id, full_name, first_name, last_name")
      .in("id", userIds)
    for (const p of pf || []) {
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Customer"
      names.set(String(p.id), name)
    }
  }

  const result = ords.map((o) => ({ ...o, customer: names.get(o.user_id) || "Customer" }))
  return NextResponse.json({ orders: result })
}
