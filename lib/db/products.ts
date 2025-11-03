import { supabase, isSupabaseConfigured } from "@/lib/supabase/client"
import { productDatabase, sampleReviews, type Product, type Review } from "@/lib/product-data"

/**
 * Fetch products from Supabase. If Supabase env is not configured,
 * it will return the local in-repo sample `productDatabase`.
 */
export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return productDatabase
  }
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, original_price, category, rating, reviews, image, description, long_description, features, stock, in_stock"
    )
    .order("id", { ascending: true })

  if (error) {
    console.error("Supabase fetchProducts error:", error)
    return productDatabase
  }

  // Map DB columns to Product interface names
  const mapped: Product[] = (data || []).map((p: any) => ({
    id: Number(p.id),
    name: p.name,
    price: Number(p.price),
    originalPrice: p.original_price != null ? Number(p.original_price) : undefined,
    category: p.category,
    rating: Number(p.rating ?? 0),
    reviews: Number(p.reviews ?? 0),
    image: p.image ?? "",
    description: p.description ?? "",
    longDescription: p.long_description ?? "",
    features: Array.isArray(p.features) ? p.features : [],
    stock: Number(p.stock ?? 0),
    inStock: Boolean(p.in_stock ?? (p.stock ?? 0) > 0),
  }))

  return mapped
}

export async function fetchProductById(id: number): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return productDatabase.find((p) => p.id === id) ?? null
  }
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, original_price, category, rating, reviews, image, description, long_description, features, stock, in_stock"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Supabase fetchProductById error:", error)
    return productDatabase.find((p) => p.id === id) ?? null
  }

  if (!data) return null

  const p: any = data
  const mapped: Product = {
    id: Number(p.id),
    name: p.name,
    price: Number(p.price),
    originalPrice: p.original_price != null ? Number(p.original_price) : undefined,
    category: p.category,
    rating: Number(p.rating ?? 0),
    reviews: Number(p.reviews ?? 0),
    image: p.image ?? "",
    description: p.description ?? "",
    longDescription: p.long_description ?? "",
    features: Array.isArray(p.features) ? p.features : [],
    stock: Number(p.stock ?? 0),
    inStock: Boolean(p.in_stock ?? (p.stock ?? 0) > 0),
  }

  return mapped
}

export async function fetchReviewsByProductId(productId: number): Promise<Review[]> {
  if (!isSupabaseConfigured()) {
    return sampleReviews.filter((r) => r.productId === productId)
  }
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, author, rating, title, comment, created_at, helpful")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Supabase fetchReviewsByProductId error:", error)
    return sampleReviews.filter((r) => r.productId === productId)
  }

  const mapped = (data || []).map((r: any) => ({
    id: String(r.id),
    productId: Number(r.product_id),
    author: r.author ?? "Anonymous",
    rating: Number(r.rating ?? 0),
    title: r.title ?? "",
    comment: r.comment ?? "",
    date: r.created_at ?? new Date().toISOString(),
    helpful: Number(r.helpful ?? 0),
    liked: false,
  }))

  try {
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id
    if (userId && mapped.length > 0) {
      const reviewIds = mapped.map((r) => r.id)
      const { data: likedRows, error: likedErr } = await supabase
        .from("review_helpfuls")
        .select("review_id")
        .eq("user_id", userId)
        .in("review_id", reviewIds)

      if (!likedErr && likedRows) {
        const likedSet = new Set((likedRows as any[]).map((row) => String(row.review_id)))
        for (const r of mapped) {
          r.liked = likedSet.has(r.id)
        }
      }
    }
  } catch (e) {
    // ignore user fetch errors; default liked=false
  }

  return mapped
}

/**
 * Fetch aggregated review stats (count and average rating) for a set of product IDs.
 * Uses Supabase when configured; otherwise computes from local sampleReviews.
 */
export async function fetchReviewStatsForProductIds(
  productIds: number[]
): Promise<Record<number, { count: number; average: number }>> {
  const result: Record<number, { count: number; average: number }> = {}

  if (!productIds || productIds.length === 0) return result

  if (!isSupabaseConfigured()) {
    const filtered = sampleReviews.filter((r) => productIds.includes(r.productId))
    const sums: Record<number, { sum: number; count: number }> = {}
    for (const r of filtered) {
      const key = r.productId
      if (!sums[key]) sums[key] = { sum: 0, count: 0 }
      sums[key].sum += r.rating
      sums[key].count += 1
    }
    for (const id of productIds) {
      const s = sums[id]
      const count = s?.count ?? 0
      const average = count > 0 ? s!.sum / count : 0
      result[id] = { count, average }
    }
    return result
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("product_id, rating")
    .in("product_id", productIds)

  if (error) {
    console.error("Supabase fetchReviewStatsForProductIds error:", error)
    return result
  }

  const sums: Record<number, { sum: number; count: number }> = {}
  for (const row of data || []) {
    const pid = Number(row.product_id)
    if (!sums[pid]) sums[pid] = { sum: 0, count: 0 }
    sums[pid].sum += Number(row.rating ?? 0)
    sums[pid].count += 1
  }
  for (const id of productIds) {
    const s = sums[id]
    const count = s?.count ?? 0
    const average = count > 0 ? s!.sum / count : 0
    result[id] = { count, average }
  }

  return result
}
