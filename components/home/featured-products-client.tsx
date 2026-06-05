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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-stone-50">
      <h2 className="text-3xl font-black mb-12 text-black tracking-tight uppercase">Featured Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 relative group"
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
                  className={`absolute top-3 right-3 z-10 p-2 border-2 border-black rounded-none bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100`}
                >
                  <Heart size={16} className={isWishlisted ? "fill-rose-500 text-rose-500 stroke-[2.5]" : "text-black stroke-[2.5] hover:text-rose-500 transition-colors"} />
                </button>
              )
            })()}
            <Link href={`/product/${product.id}`} className="block overflow-hidden bg-stone-100 border-b-4 border-black">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-48 object-cover cursor-pointer"
              />
            </Link>
            <div className="p-5">
              <Link href={`/product/${product.id}`}>
                <h3 className="font-black text-black text-base mb-1 hover:underline decoration-2 line-clamp-1 cursor-pointer transition-all">
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
                            className={full ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" : half ? "fill-amber-300 text-amber-300 stroke-black stroke-[1.5]" : "text-gray-200"}
                            style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
                          />
                        )
                      })}
                      <span className="text-xs text-black font-black ml-1.5">{avg.toFixed(1)} ({stats[product.id]?.count ?? 0})</span>
                    </>
                  )
                })()}
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-lg font-black text-black bg-yellow-200 border-2 border-black px-2 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{formatIDR(product.price)}</span>
                {/* Cart Button Only */}
                {(() => {
                  const outOfStock = !product.inStock || Number(product.stock ?? 0) <= 0
                  if (outOfStock) {
                    return (
                      <button
                        disabled
                        className="px-2.5 py-1.5 text-xs border-2 border-black font-black text-black bg-stone-200 cursor-not-allowed uppercase"
                        title="Out of stock"
                      >
                        Sold Out
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`p-2 border-2 border-black rounded-none transition-all duration-100 inline-flex items-center gap-1 ${
                        maxStockItem === product.id
                          ? "bg-orange-300 text-black shadow-none translate-x-[2px] translate-y-[2px]"
                          : addedItem === product.id
                            ? "bg-green-300 text-black shadow-none translate-x-[2px] translate-y-[2px]"
                            : "bg-blue-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                      }`}
                    >
                      <ShoppingCart size={16} className="stroke-[2.5]" />
                      <span className="text-xs font-black uppercase">
                        {maxStockItem === product.id ? "Max!" : addedItem === product.id ? "In!" : "Buy"}
                      </span>
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
