"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Star, ShoppingCart, Heart } from "lucide-react"
import type { Product } from "@/lib/product-data"
import { fetchReviewStatsForProductIds } from "@/lib/db/products"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { normalizeSearch, formatIDR } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

type Props = { initialProducts: Product[]; initialSearch?: string }

export default function CatalogClient({ initialProducts, initialSearch }: Props) {
  const { addToWishlist, removeFromWishlist, wishlistItems } = useWishlist()
  const { addToCart, cartItems } = useCart()
  const { user } = useAuth()
  const [products] = useState<Product[]>(initialProducts)
  const [loading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(initialSearch ?? "")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const prices = products.map((p) => p.price)
  const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 0
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice, maxPrice])
  const [addedItem, setAddedItem] = useState<number | null>(null)
  const [maxStockItem, setMaxStockItem] = useState<number | null>(null)
  const [stats, setStats] = useState<Record<number, { count: number; average: number }>>({})

  // Keep the URL's `search` param in sync with what's typed here
  // so the Navbar search reads the same value.
  const router = useRouter()
  const debounceRef = useRef<number | undefined>(undefined)

  // When the server-provided initialSearch changes due to a navigation
  // (e.g., typing in the Navbar and pushing /catalog?search=...),
  // keep this client's state in sync so filtering updates correctly.
  useEffect(() => {
    setSearchTerm(initialSearch ?? "")
  }, [initialSearch])

  useEffect(() => {
    if (typeof window === "undefined") return
    const { pathname, search } = window.location
    // only run on /catalog
    if (!pathname.startsWith("/catalog")) return
    const current = new URLSearchParams(search).get("search") ?? ""
    if (current === searchTerm) return
    // debounce URL updates for smoother typing
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (searchTerm) params.set("search", searchTerm)
      else params.delete("search")
      const qs = params.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      router.replace(href)
      // Notify navbar to synchronize its input value
      window.dispatchEvent(new Event("nav:search"))
    }, 250)
    return () => window.clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Fetch review stats for the currently visible set when product list changes
  useEffect(() => {
    const ids = products.map((p) => p.id)
    if (ids.length === 0) return
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
    addToCart({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.image })
    setAddedItem(product.id)
    setTimeout(() => setAddedItem(null), 2000)
  }

  const categories = useMemo(() => ["all", ...new Set(products.map((p) => p.category))], [products])

  const filteredProducts = useMemo(() => {
    let result = products.slice()
    const q = normalizeSearch(searchTerm)
    if (q) result = result.filter((p) => normalizeSearch(p.name).includes(q))
    if (selectedCategory !== "all") result = result.filter((p) => p.category === selectedCategory)
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    if (sortBy === "price-low") result.sort((a, b) => a.price - b.price)
    else if (sortBy === "price-high") result.sort((a, b) => b.price - a.price)
    else if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating)
    else result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [products, searchTerm, selectedCategory, sortBy, priceRange])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 space-y-6 shadow-lg sticky top-20">
          {/* Search */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-bold text-black mb-3">Category</label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={selectedCategory === cat}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-4 h-4 border-2 border-gray-300"
                  />
                  <span className="capitalize text-sm font-bold text-black">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-bold text-black mb-3">Price Range</label>
            <div className="space-y-2">
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value)
                  setPriceRange([priceRange[0], Math.max(next, priceRange[0])])
                }}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-sm font-bold text-black">
                <span>{formatIDR(priceRange[0])}</span>
                <span>{formatIDR(priceRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="name">Name (A-Z)</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="price-high">Price (High to Low)</option>
              <option value="rating">Rating (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-black font-bold">Loading products…</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-black font-bold">No products found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
