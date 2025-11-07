"use client"

import Link from "next/link"
import { Star, ShoppingCart, Heart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatIDR } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useWishlist } from "@/lib/wishlist-context"
import type { Product } from "@/lib/product-data"
import { fetchReviewStatsForProductIds } from "@/lib/db/products"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function FeaturedProductsClient({ products }: { products: Product[] }) {
  const { addToWishlist, removeFromWishlist, wishlistItems } = useWishlist()
  const { addToCart, cartItems } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [addedItem, setAddedItem] = useState<number | null>(null)
  const [maxStockItem, setMaxStockItem] = useState<number | null>(null)
  const [stats, setStats] = useState<Record<number, { count: number; average: number }>>({})

  useEffect(() => {
    const ids = products.map((p) => p.id)
    fetchReviewStatsForProductIds(ids).then(setStats).catch(() => setStats({}))
  }, [products])

  const handleAddToCart = (product: Product) => {
    if (!user) {
      router.push("/login")
      return
    }
    const inCart = cartItems.find((i) => i.id === product.id)?.quantity ?? 0
    const maxStock = Number(product.stock ?? 0)
    if (inCart >= maxStock) {
      setMaxStockItem(product.id)
      setTimeout(() => setMaxStockItem(null), 2000)
      return
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    })
    setAddedItem(product.id)
    setTimeout(() => setAddedItem(null), 2000)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white">
      <h2 className="text-3xl font-bold mb-12 text-black text-balance">Featured Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:scale-105 relative"
          >
            {/* Wishlist Button - pojok kanan atas */}
            {(() => {
              const isWishlisted = wishlistItems.some((w) => w.id === product.id)
              return (
                <button
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  onClick={() => {
                    if (!user) {
                      router.push("/login")
                      return
                    }
                    if (isWishlisted) removeFromWishlist(product.id)
                    else addToWishlist({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                    })
                  }}
                  className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow transition ${isWishlisted ? "bg-pink-100" : "bg-gray-100 hover:bg-pink-200"}`}
                >
                  <Heart size={22} className={isWishlisted ? "fill-green-600 text-green-600" : "text-gray-400"} />
                </button>
              )
            })()}
            <Link href={`/product/${product.id}`}>
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-48 object-cover cursor-pointer"
              />
            </Link>
            <div className="p-4">
              <Link href={`/product/${product.id}`}>
                <h3 className="font-bold text-lg mb-2 text-black hover:text-blue-600 cursor-pointer transition">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1 mb-3">
                {(() => {
                  const avg = stats[product.id]?.average ?? 0
                  return (
                    <>
                      {[...Array(5)].map((_, i) => {
                        const full = i < Math.floor(avg)
                        const half = !full && i === Math.floor(avg) && avg % 1 >= 0.25
                        return (
                          <Star
                            key={i}
                            size={16}
                            className={full ? "fill-red-600 text-red-600" : half ? "fill-red-400 text-red-400" : "text-gray-300"}
                            style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
                          />
                        )
                      })}
                      <span className="text-sm text-black font-semibold ml-2">{avg.toFixed(1)} · {stats[product.id]?.count ?? 0}</span>
                    </>
                  )
                })()}
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-xl font-bold text-blue-600">{formatIDR(product.price)}</span>
                {/* Cart Button Only */}
                {(() => {
                  const outOfStock = !product.inStock || Number(product.stock ?? 0) <= 0
                  if (outOfStock) {
                    return (
                      <button
                        disabled
                        className="px-2 py-1 text-xs rounded-md font-semibold inline-flex items-center gap-1 border border-red-600 text-red-600 bg-white cursor-not-allowed"
                        title="Out of stock"
                      >
                        <ShoppingCart size={14} />
                        Out of stock
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`p-2 rounded-lg font-semibold transition inline-flex items-center gap-1 ${
                        maxStockItem === product.id
                          ? "bg-orange-600 text-white"
                          : addedItem === product.id
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <ShoppingCart size={18} />
                      {maxStockItem === product.id ? "Max stock!" : addedItem === product.id ? "Added!" : ""}
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
