"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Star, ShoppingCart } from "lucide-react"
import type { Product } from "@/lib/product-data"
import { useCart } from "@/lib/cart-context"
import { normalizeSearch } from "@/lib/utils"
import { useRouter } from "next/navigation"

type Props = { initialProducts: Product[]; initialSearch?: string }

export default function CatalogClient({ initialProducts, initialSearch }: Props) {
  const { addToCart } = useCart()
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

  // Keep the URL's `search` param in sync with what's typed here
  // so the Navbar search reads the same value.
  const router = useRouter()
  const debounceRef = useRef<number | undefined>(undefined)

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

  const handleAddToCart = (product: Product) => {
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
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:scale-105"
              >
                <Link href={`/product/${product.id}`}>
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-48 object-cover cursor-pointer"
                  />
                </Link>
                <div className="p-4">
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-bold text-lg mb-2 text-black hover:text-blue-600 cursor-pointer">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${i < Math.floor(product.rating) ? "fill-red-600 text-red-600" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-xs text-black font-bold ml-1">({product.rating})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-blue-600">${product.price}</span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`p-2 rounded-lg font-semibold transition flex items-center gap-1 ${
                        addedItem === product.id ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <ShoppingCart size={20} />
                      {addedItem === product.id ? "Added!" : ""}
                    </button>
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
