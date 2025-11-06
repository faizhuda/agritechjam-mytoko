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
    .eq('archived', false)
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
    .eq('archived', false)
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
    console.log('⚠️ Supabase not configured, returning empty reviews')
    // Return empty array instead of sample data when using real database
    return []
  }
  
  console.log('🔍 Fetching reviews for product:', productId)
  
  // Fetch from product_reviews table (one review per user per product)
  // Note: We fetch reviews first, then separately fetch user names to avoid FK issues
  const { data, error } = await supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      user_id,
      rating,
      comment,
      created_at,
      helpful
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Supabase fetchReviewsByProductId error:")
    console.error("Full error object:", JSON.stringify(error, null, 2))
    console.error("Error details:", {
      productId,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint,
      errorStatus: (error as any)?.status,
      errorStatusText: (error as any)?.statusText
    })
    // Return empty array on error instead of sample data
    return []
  }

  console.log('✅ Reviews data fetched:', data)
  console.log('✅ Number of reviews:', data?.length || 0)

  // Fetch user names separately to avoid FK relationship issues
  const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))]
  let userNameMap: Record<string, string> = {}
  
  if (userIds.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
      
      if (profiles) {
        userNameMap = Object.fromEntries(
          profiles.map((p: any) => [p.id, p.full_name || "Anonymous"])
        )
      }
    } catch (e) {
      console.warn("Could not fetch user profiles, using Anonymous for all")
    }
  }

  const mapped = (data || []).map((r: any) => ({
    id: String(r.id),
    productId: Number(r.product_id),
    author: userNameMap[r.user_id] || "Anonymous",
    rating: Number(r.rating ?? 0),
    title: "", // product_reviews doesn't have title
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
 * Fetch multiple products by their IDs with a single query when possible.
 * Falls back to local sample data when Supabase isn't configured.
 */
export async function fetchProductsByIds(ids: number[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(ids.filter((x) => Number.isFinite(x)))) as number[]
  if (uniqueIds.length === 0) return []

  if (!isSupabaseConfigured()) {
    return productDatabase.filter((p) => uniqueIds.includes(p.id))
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, original_price, category, rating, reviews, image, description, long_description, features, stock, in_stock"
    )
    .eq('archived', false)
    .in("id", uniqueIds)

  if (error) {
    console.error("Supabase fetchProductsByIds error:", error)
    return []
  }

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
    // Return empty stats when using real database
    for (const id of productIds) {
      result[id] = { count: 0, average: 0 }
    }
    return result
  }

  const { data, error } = await supabase
    .from("product_reviews")
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
