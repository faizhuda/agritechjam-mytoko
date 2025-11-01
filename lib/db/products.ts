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

  return (data || []).map((r: any) => ({
    id: String(r.id),
    productId: Number(r.product_id),
    author: r.author ?? "Anonymous",
    rating: Number(r.rating ?? 0),
    title: r.title ?? "",
    comment: r.comment ?? "",
    date: r.created_at ?? new Date().toISOString(),
    helpful: Number(r.helpful ?? 0),
  }))
}
