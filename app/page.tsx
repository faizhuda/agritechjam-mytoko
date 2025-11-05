// Always fetch fresh data for Home (Featured Products)
export const dynamic = "force-dynamic"
export const revalidate = 0
import Hero from "@/components/home/hero"
import FeaturedProducts from "@/components/home/featured-products"
import RealtimeRefresh from "@/components/realtime-refresh"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Auto-refresh this page when products change */}
      <RealtimeRefresh table="products" />
      <Hero />
      <FeaturedProducts />
    </div>
  )
}
