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
      <h2 className="text-3xl font-extrabold mb-12 text-gray-900 tracking-tight text-balance">Featured Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group"
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
                  className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow-sm transition-all duration-300 ${isWishlisted ? "bg-rose-50 border border-rose-100" : "bg-white/80 hover:bg-rose-50 backdrop-blur-sm hover:scale-115"}`}
                >
                  <Heart size={18} className={isWishlisted ? "fill-rose-500 text-rose-500" : "text-gray-400 hover:text-rose-500 transition-colors"} />
                </button>
              )
            })()}
            <Link href={`/product/${product.id}`} className="block overflow-hidden bg-gray-50">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-48 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
              />
            </Link>
            <div className="p-5">
              <Link href={`/product/${product.id}`}>
                <h3 className="font-bold text-gray-900 text-base mb-1 hover:text-blue-600 line-clamp-1 cursor-pointer transition-colors">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1 mb-4">
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
                            size={14}
                            className={full ? "fill-amber-400 text-amber-400" : half ? "fill-amber-300 text-amber-300" : "text-gray-200"}
                            style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
                          />
                        )
                      })}
                      <span className="text-xs text-gray-500 font-semibold ml-1.5">{avg.toFixed(1)} ({stats[product.id]?.count ?? 0})</span>
                    </>
                  )
                })()}
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-lg font-black text-blue-600">{formatIDR(product.price)}</span>
                {/* Cart Button Only */}
                {(() => {
                  const outOfStock = !product.inStock || Number(product.stock ?? 0) <= 0
                  if (outOfStock) {
                    return (
                      <button
                        disabled
                        className="px-2.5 py-1.5 text-xs rounded-full font-semibold inline-flex items-center gap-1 border border-red-200 text-red-500 bg-red-50/50 cursor-not-allowed"
                        title="Out of stock"
                      >
                        <ShoppingCart size={12} />
                        Sold Out
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`p-2 rounded-full font-semibold transition-all active:scale-90 inline-flex items-center gap-1 ${
                        maxStockItem === product.id
                          ? "bg-orange-500 text-white"
                          : addedItem === product.id
                            ? "bg-green-500 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
                      }`}
                    >
                      <ShoppingCart size={16} />
                      {maxStockItem === product.id ? "Max!" : addedItem === product.id ? "In!" : ""}
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
