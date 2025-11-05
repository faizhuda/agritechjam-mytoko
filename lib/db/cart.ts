import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"

export interface DBCartItem {
  productId: number
  name: string
  price: number
  image: string
  quantity: number
}

export async function getOrCreateCartId(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  // Try to find existing cart
  const { data: existing, error: selectErr } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (!selectErr && existing?.id) return existing.id

  // Create new cart for user
  const { data: created, error: insertErr } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single()

  if (insertErr) {
    console.error("create cart error", insertErr)
    return null
  }
  return created.id
}

export async function listCartItems(userId: string): Promise<DBCartItem[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `quantity, products:product_id(id, name, price, image), carts!inner(user_id)`
    )
    .eq("carts.user_id", userId)

  if (error) {
    console.error("listCartItems error", error)
    return []
  }

  return (data || []).map((row: any) => ({
    productId: Number(row.products.id),
    name: row.products.name,
    price: Number(row.products.price),
    image: row.products.image ?? "",
    quantity: Number(row.quantity),
  }))
}

export async function addToCart(userId: string, productId: number, quantity: number) {
  if (!isSupabaseConfigured()) return
  const cartId = await getOrCreateCartId(userId)
  if (!cartId) return

  // Get existing quantity
  const { data: existing, error: fetchErr } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle()

  if (fetchErr) {
    console.error("fetch cart_item error", fetchErr)
  }

  const newQty = Number((existing?.quantity ?? 0)) + quantity
  const { error: upsertErr } = await supabase
    .from("cart_items")
    .upsert(
      { cart_id: cartId, product_id: productId, quantity: newQty },
      { onConflict: "cart_id,product_id" }
    )

  if (upsertErr) console.error("upsert cart_item error", upsertErr)
}

export async function updateCartItem(userId: string, productId: number, quantity: number) {
  if (!isSupabaseConfigured()) return
  const cartId = await getOrCreateCartId(userId)
  if (!cartId) return
  if (quantity <= 0) {
    await removeFromCart(userId, productId)
    return
  }
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("cart_id", cartId)
    .eq("product_id", productId)
  if (error) console.error("updateCartItem error", error)
}

export async function removeFromCart(userId: string, productId: number) {
  if (!isSupabaseConfigured()) return
  const cartId = await getOrCreateCartId(userId)
  if (!cartId) return
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId)
    .eq("product_id", productId)
  if (error) console.error("removeFromCart error", error)
}

export async function clearCart(userId: string) {
  if (!isSupabaseConfigured()) return
  const cartId = await getOrCreateCartId(userId)
  if (!cartId) return
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId)
  if (error) console.error("clearCart error", error)
}
