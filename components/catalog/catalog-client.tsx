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
        <div className="bg-white border-4 border-black p-6 space-y-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-24">
          {/* Search */}
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">Category</label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={selectedCategory === cat}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-4 h-4 border-2 border-black rounded-none accent-black bg-white focus:outline-none"
                  />
                  <span className="capitalize text-sm font-bold text-black group-hover:underline decoration-2">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-black text-black mb-3 uppercase tracking-wide">Price Range</label>
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
                className="w-full accent-black cursor-pointer bg-white border border-black"
              />
              <div className="flex justify-between text-xs font-black text-black bg-stone-100 border-2 border-black px-2 py-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <span>{formatIDR(priceRange[0])}</span>
                <span>{formatIDR(priceRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
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
          <div className="text-center py-12 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-lg text-black font-black uppercase">Loading products…</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
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
                      className="absolute top-3 right-3 z-10 p-2 border-2 border-black rounded-none bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
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
        ) : (
          <div className="text-center py-12 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-lg text-black font-black uppercase">No products found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
