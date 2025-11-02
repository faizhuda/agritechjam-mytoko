import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const { error } = await supabase.rpc("set_order_status", { p_order_id: params.id, p_status: newStatus })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
