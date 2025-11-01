import { fetchProducts } from "@/lib/db/products"
import FeaturedProductsClient from "./featured-products-client"

export default async function FeaturedProducts() {
  const products = await fetchProducts()
  const featured = products.slice(0, 4)
  return <FeaturedProductsClient products={featured} />
}
