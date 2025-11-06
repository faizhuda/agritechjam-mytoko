import { NextRequest, NextResponse } from "next/server"
import { createRouteClient } from "@/lib/supabase/server"

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

  // Verify order belongs to user
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", auth.user.id) // RLS will enforce this anyway
    .maybeSingle()

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
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", auth.user.id)

    if (updateErr) {
      console.error("❌ Failed to cancel order:", updateErr)
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      )
    }

    // 2. Get order items to return stock
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", id)

    // 3. Return stock for each item
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single()
        
        if (product) {
          const newStock = Number(product.stock || 0) + item.quantity
          await supabase
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
