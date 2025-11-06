import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all products with reviews
    const { data: reviewData, error: reviewError } = await supabase
      .from("order_reviews")
      .select("product_id, rating")

    if (reviewError) {
      console.error("Error fetching reviews:", reviewError)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    // Group reviews by product_id and calculate averages
    const productStats = new Map<number, { totalRating: number; count: number }>()
    
    for (const review of reviewData || []) {
      const productId = review.product_id
      const current = productStats.get(productId) || { totalRating: 0, count: 0 }
      current.totalRating += review.rating
      current.count += 1
      productStats.set(productId, current)
    }

    // Update each product
    const updates = []
    for (const [productId, stats] of productStats.entries()) {
      const avgRating = Number((stats.totalRating / stats.count).toFixed(2))
      
      const { error: updateError } = await supabase
        .from("products")
        .update({
          rating: avgRating,
          reviews: stats.count,
        })
        .eq("id", productId)

      if (updateError) {
        console.error(`Error updating product ${productId}:`, updateError)
      } else {
        updates.push({ productId, rating: avgRating, reviews: stats.count })
      }
    }

    // Reset products with no reviews
    const productsWithReviews = Array.from(productStats.keys())
    const { data: allProducts } = await supabase.from("products").select("id")
    const productsToReset = (allProducts || [])
      .map((p: any) => p.id)
      .filter((id: number) => !productsWithReviews.includes(id))

    for (const productId of productsToReset) {
      await supabase
        .from("products")
        .update({ rating: 0, reviews: 0 })
        .eq("id", productId)
    }

    return NextResponse.json({
      success: true,
      message: "Product ratings synced successfully",
      updated: updates.length,
      reset: productsToReset.length,
      updates,
    })
  } catch (error) {
    console.error("Sync ratings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
