import { fetchProducts, fetchReviewStatsForProductIds } from "@/lib/db/products"
import FeaturedProductsClient from "./featured-products-client"

export default async function FeaturedProducts() {
  const products = await fetchProducts()
  const productIds = products.map((p) => p.id)
  
  // Fetch actual review stats from database
  const reviewStats = await fetchReviewStatsForProductIds(productIds)
  
  // Sort by actual average rating from reviews (highest first), then by review count
  const topRated = products
    .map((p) => ({
      ...p,
      actualRating: reviewStats[p.id]?.average ?? 0,
      reviewCount: reviewStats[p.id]?.count ?? 0,
    }))
    .sort((a, b) => {
      // Sort by rating first (highest first)
      if (b.actualRating !== a.actualRating) {
        return b.actualRating - a.actualRating
      }
      // If same rating, sort by review count (more reviews first)
      return b.reviewCount - a.reviewCount
    })
    .slice(0, 4)
  
  return <FeaturedProductsClient products={topRated} />
}
