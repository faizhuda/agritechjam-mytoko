import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient(req)

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const newStatus = String(body?.status || "").toLowerCase()
  if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  // Optional pre-check: ensure user is admin (better error than generic RPC)
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabase.rpc("set_order_status", { p_order_id: id, p_status: newStatus })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
