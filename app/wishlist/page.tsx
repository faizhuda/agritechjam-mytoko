"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, ShoppingCart, ArrowLeft } from "lucide-react"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { formatIDR } from "@/lib/utils"
import { fetchProductsByIds, fetchReviewStatsForProductIds } from "@/lib/db/products"

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist } = useWishlist()
  const { addToCart, cartItems } = useCart()
  const [addedToCart, setAddedToCart] = useState<number | null>(null)
  const [maxStockItem, setMaxStockItem] = useState<number | null>(null)
  const [stats, setStats] = useState<Record<number, { count: number; average: number }>>({})
  const [availability, setAvailability] = useState<Record<number, { inStock: boolean; stock: number }>>({})

  const handleAddToCart = (item: any) => {
    const inCart = cartItems.find((i) => i.id === item.id)?.quantity ?? 0
    const maxStock = availability[item.id]?.stock ?? 0
    
    if (inCart >= maxStock) {
      setMaxStockItem(item.id)
      setTimeout(() => setMaxStockItem(null), 2000)
      return
    }

    addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image })
    setAddedToCart(item.id)
    setTimeout(() => setAddedToCart(null), 2000)
  }

  // Fetch live review stats for wishlist items from Supabase (or sample fallback inside function)
  useEffect(() => {
    const ids = wishlistItems.map((w) => w.id)
    if (ids.length === 0) return
    fetchReviewStatsForProductIds(ids).then(setStats).catch(() => setStats({}))
    // Also fetch availability (stock/inStock) to decide button/label states
    fetchProductsByIds(ids)
      .then((prods) => {
        const map: Record<number, { inStock: boolean; stock: number }> = {}
        for (const p of prods) {
          map[p.id] = { inStock: Boolean(p.inStock), stock: Number(p.stock ?? 0) }
        }
        setAvailability(map)
      })
      .catch(() => setAvailability({}))
  }, [wishlistItems])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold mb-4">
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-black mb-2">My Wishlist</h1>
          <p className="text-black text-lg font-semibold">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl shadow-lg p-12 text-center">
            <Heart size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-black mb-2">Your wishlist is empty</h2>
            <p className="text-black font-semibold mb-6">Start adding your favorite products to your wishlist!</p>
            <Link href="/catalog" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden">
                {/* Product Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                  <button onClick={() => removeFromWishlist(item.id)} className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-green-50 transition" title="Remove from wishlist">
                    <Heart size={20} className="fill-green-600 text-green-600" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <Link href={`/product/${item.id}`}>
                    <h3 className="text-lg font-bold text-black hover:text-blue-600 transition truncate">{item.name}</h3>
                  </Link>

                  {/* Rating */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex gap-1">
                      {(() => {
                        const avg = stats[item.id]?.average ?? 0
                        return [1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-sm ${star <= Math.round(avg) ? "text-yellow-400" : "text-gray-300"}`}>★</span>
                        ))
                      })()}
                    </div>
                    <span className="text-sm text-black font-semibold">{(stats[item.id]?.average ?? 0).toFixed(1)} ({stats[item.id]?.count ?? 0})</span>
                  </div>

                  {/* Price */}
                  <p className="text-2xl font-bold text-blue-600 mb-4">{formatIDR(item.price)}</p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(() => {
                      const avail = availability[item.id]
                      const outOfStock = avail ? (!avail.inStock || Number(avail.stock ?? 0) <= 0) : false
                      if (outOfStock) {
                        return (
                          <button
                            disabled
                            className="flex-1 px-2 py-1 text-xs rounded-md font-bold inline-flex items-center justify-center gap-1 border border-red-600 text-red-600 bg-white cursor-not-allowed"
                            title="Out of stock"
                          >
                            <ShoppingCart size={14} />
                            Out of stock
                          </button>
                        )
                      }
                      return (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={`flex-1 py-2 rounded-lg font-bold transition inline-flex items-center justify-center gap-2 ${
                            maxStockItem === item.id
                              ? "bg-orange-600 text-white"
                              : addedToCart === item.id
                                ? "bg-green-600 text-white"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <ShoppingCart size={16} />
                          {maxStockItem === item.id ? "Max stock!" : addedToCart === item.id ? "Added!" : "Add to Cart"}
                        </button>
                      )
                    })()}
                    <Link href={`/product/${item.id}`} className="flex-1 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition text-center">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
