"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart, ShoppingCart, ArrowLeft, Star } from "lucide-react"
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-black font-black underline hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft size={20} className="stroke-[2.5]" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-black mb-2 uppercase tracking-tight">My Wishlist</h1>
          <p className="text-black text-lg font-bold uppercase">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <Heart size={48} className="mx-auto mb-4 text-black stroke-[2.5]" />
            <h2 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Your wishlist is empty</h2>
            <p className="text-black font-bold mb-6">Start adding your favorite products to your wishlist!</p>
            <Link href="/catalog" className="inline-block px-6 py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden flex flex-col">
                {/* Product Image */}
                <div className="relative h-48 bg-stone-100 overflow-hidden border-b-2 border-black">
                  <Link href={`/product/${item.id}`}>
                    <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition duration-300 cursor-pointer" />
                  </Link>
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-2 right-2 p-2 bg-white border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    title="Remove from wishlist"
                  >
                    <Heart size={20} className="fill-rose-500 text-rose-500 stroke-[2.5]" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col flex-grow">
                  <Link href={`/product/${item.id}`} className="mb-2 block">
                    <h3 className="text-lg font-black text-black hover:text-blue-600 transition truncate uppercase tracking-tight">{item.name}</h3>
                  </Link>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-0.5">
                      {(() => {
                        const avg = stats[item.id]?.average ?? 0
                        return [...Array(5)].map((_, i) => {
                          const full = i < Math.floor(avg)
                          const half = !full && i === Math.floor(avg) && avg % 1 >= 0.25
                          return (
                            <Star
                              key={i}
                              size={14}
                              className={full ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" : half ? "fill-amber-300 text-amber-300 stroke-black stroke-[1.5]" : "text-gray-300"}
                              style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
                            />
                          )
                        })
                      })()}
                    </div>
                    <span className="text-xs text-black font-black">{(stats[item.id]?.average ?? 0).toFixed(1)} ({stats[item.id]?.count ?? 0})</span>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-xl font-black text-black bg-yellow-200 border-2 border-black px-2.5 py-1 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {formatIDR(item.price)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    {(() => {
                      const avail = availability[item.id]
                      const outOfStock = avail ? (!avail.inStock || Number(avail.stock ?? 0) <= 0) : false
                      if (outOfStock) {
                        return (
                          <button
                            disabled
                            className="flex-1 px-2 py-2 text-xs border-2 border-red-500 bg-red-100 text-red-700 rounded-none font-black inline-flex items-center justify-center gap-1 cursor-not-allowed uppercase"
                            title="Out of stock"
                          >
                            <ShoppingCart size={14} className="stroke-[2.5]" />
                            Out of stock
                          </button>
                        )
                      }
                      return (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={`flex-grow flex-1 py-2 border-2 border-black rounded-none font-black uppercase transition-all inline-flex items-center justify-center gap-2 ${
                            maxStockItem === item.id
                              ? "bg-orange-400 text-black shadow-none translate-x-[3px] translate-y-[3px]"
                              : addedToCart === item.id
                                ? "bg-green-400 text-black shadow-none translate-x-[3px] translate-y-[3px]"
                                : "bg-blue-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                          }`}
                        >
                          <ShoppingCart size={16} className="stroke-[2.5]" />
                          {maxStockItem === item.id ? "Max!" : addedToCart === item.id ? "Added!" : "Add"}
                        </button>
                      )
                    })()}
                    <Link
                      href={`/product/${item.id}`}
                      className="flex-1 py-2 border-2 border-black bg-white hover:bg-stone-50 text-black rounded-none font-black text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase text-sm flex items-center justify-center"
                    >
                      Details
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
