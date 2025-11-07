import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteClient(req)

  // Check auth
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Check if caller is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle()

  const isAdmin = Boolean((profile as any)?.is_admin)

  // If admin and service role key is available, use a service client to bypass RLS
  // Prefer the non-public URL for the service client, fall back to public if needed.
  const serviceUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If caller is admin but there is no service role key configured, return a helpful error
  // instead of silently continuing with the route client (which may be blocked by RLS).
  if (isAdmin && !serviceKey) {
    return NextResponse.json(
      { error: "Admin action requires SUPABASE_SERVICE_ROLE_KEY to be set on the server. Please add the service role key to your environment." },
      { status: 403 }
    )
  }

  const client = isAdmin && serviceKey ? createServiceClient(serviceUrl, serviceKey) : supabase

  // Verify order exists (admins can fetch any order; regular users only their own)
  let orderQuery = client.from("orders").select("id, user_id, status").eq("id", id)
  if (!isAdmin) orderQuery = (orderQuery as any).eq("user_id", auth.user.id)
  const { data: order, error: orderErr } = await orderQuery.maybeSingle()

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 400 })
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Check if order can be cancelled (only pending or paid orders)
  const status = String(order.status || "").toLowerCase()
  if (status !== "pending" && status !== "paid") {
    return NextResponse.json(
      { error: `Cannot cancel order with status: ${order.status}` },
      { status: 400 }
    )
  }

  try {
    // 1. Update order status to cancelled
    // Use the same client (service or route client) to perform updates
    const { error: updateErr } = await client
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)

    if (updateErr) {
      console.error("❌ Failed to cancel order:", updateErr)
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      )
    }

    // 2. Get order items to return stock
    const { data: items } = await client
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", id)

    // 3. Return stock for each item
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: product } = await client
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single()

        if (product) {
          const newStock = Number(product.stock || 0) + item.quantity
          await client
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Order cancelled successfully" 
    })
  } catch (error: any) {
    console.error("Cancel order error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel order" },
      { status: 500 }
    )
  }
}
