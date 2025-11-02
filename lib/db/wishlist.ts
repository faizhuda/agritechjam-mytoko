import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"

export type DBWishlistItem = {
  productId: number
  name: string
  price: number
  image?: string
  rating?: number
  reviews?: number
}

export async function listWishlist(userId: string): Promise<DBWishlistItem[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from("wishlist")
    .select(
      `product_id,
       products:product_id(name, price, image, rating, reviews)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listWishlist error", error)
    return []
  }
  return (data || []).map((row: any) => ({
    productId: Number(row.product_id),
    name: row.products?.name ?? `Product #${row.product_id}`,
    price: Number(row.products?.price ?? 0),
    image: row.products?.image ?? undefined,
    rating: Number(row.products?.rating ?? 0),
    reviews: Number(row.products?.reviews ?? 0),
  }))
}

export async function addToWishlist(userId: string, productId: number) {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.from("wishlist").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" })
  if (error) throw error
}

export async function removeFromWishlist(userId: string, productId: number) {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.from("wishlist").delete().eq("user_id", userId).eq("product_id", productId)
  if (error) throw error
}

export async function clearWishlist(userId: string) {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.from("wishlist").delete().eq("user_id", userId)
  if (error) throw error
}
