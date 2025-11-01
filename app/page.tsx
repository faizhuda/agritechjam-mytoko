import Hero from "@/components/home/hero"
import FeaturedProducts from "@/components/home/featured-products"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <FeaturedProducts />
    </div>
  )
}
