"use client"

import { useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Heart, ThumbsUp } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { formatIDR } from "@/lib/utils"
import type { Product, Review } from "@/lib/product-data"
import { fetchProductById, fetchProducts, fetchReviewsByProductId } from "@/lib/db/products"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import RealtimeRefresh from "@/components/realtime-refresh"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quantity, setQuantity] = useState(1)
  const { addToCart, cartItems } = useCart() as any
  const { user } = useAuth()
  const router = useRouter()
  const [addedToCart, setAddedToCart] = useState(false)
  const [maxStock, setMaxStock] = useState(false)

  const { id } = use(params)
  const productId = Number.parseInt(id)
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { wishlistItems, addToWishlist, removeFromWishlist } = useWishlist()

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      const [p, all, rs] = await Promise.all([
        fetchProductById(productId),
        fetchProducts(),
        fetchReviewsByProductId(productId),
      ])
      console.log('🔍 Product Page - Reviews loaded:', rs)
      console.log('🔍 Product Page - Reviews count:', rs.length)
      if (!mounted) return
      setProduct(p)
      setReviews(rs)
      if (p) {
        setRelatedProducts(all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4))
      }
      setLoading(false)
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [productId])

  // Auto-refresh reviews and product when product_reviews table changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    
    const channel = supabase
      .channel(`product-${productId}-reviews`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: `product_id=eq.${productId}`
        },
        () => {
          // Reload reviews when someone adds/updates/deletes a review for this product
          fetchReviewsByProductId(productId).then(setReviews)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`
        },
        () => {
          // Reload product data when rating/reviews are updated by trigger
          fetchProductById(productId).then((p) => {
            if (p) setProduct(p)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [productId])

  // derive favorite from wishlist context to avoid local state sync issues
  const isFavorite = useMemo(() => {
    if (!product) return false
    return wishlistItems.some((w) => w.id === product.id)
  }, [wishlistItems, product])

  if (!loading && !product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold mb-8"
          >
            <ArrowLeft size={20} />
            Back to Catalog
          </Link>
          <p className="text-center text-black text-lg font-bold">Product not found</p>
        </div>
      </div>
    )
  }

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-center text-black text-lg font-bold">Loading product…</p>
        </div>
      </div>
    )
  }

  // Use synced rating from products table (updated by trigger)
  const averageRating = product.rating ?? 0
  const reviewCount = product.reviews ?? 0

  const handleAddToCart = () => {
    if (!user) {
      router.push("/login")
      return
    }
    const already = (cartItems || []).find((i: any) => i.id === product.id)?.quantity || 0
    const totalStock = Number(product.stock ?? 0)
    const maxAvailable = Math.max(0, totalStock - Number(already))
    if (maxAvailable <= 0) {
      setMaxStock(true)
      setTimeout(() => setMaxStock(false), 2000)
      return
    }
    const qty = Math.min(quantity, maxAvailable)
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.image,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const incrementQuantity = () => {
    const already = (cartItems || []).find((i: any) => i.id === product.id)?.quantity || 0
    const maxAvailable = Math.max(1, Number(product.stock ?? 0) - Number(already))
    setQuantity((q) => Math.min(q + 1, maxAvailable))
  }
  const decrementQuantity = () => quantity > 1 && setQuantity(quantity - 1)
  // relatedProducts prepared from fetched list above
  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-12">
      {/* Auto-refresh when products change */}
      <RealtimeRefresh table="products" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-black hover:underline decoration-2 transition mb-8 font-black uppercase text-sm"
        >
          <ArrowLeft size={16} className="stroke-[3]" />
          Back to Catalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Product Image */}
          <div className="flex items-center justify-center bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-black text-black mb-4 uppercase tracking-tight">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => {
                    const full = i < Math.floor(averageRating)
                    const half = !full && i === Math.floor(averageRating) && averageRating % 1 >= 0.25
                    return (
                      <Star
                        key={i}
                        size={18}
                        className={full ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" : half ? "fill-amber-300 text-amber-300 stroke-black stroke-[1.5]" : "text-gray-200"}
                        style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
                      />
                    )
                  })}
                </div>
                <span className="text-black font-black text-sm">{averageRating.toFixed(1)} ({reviewCount} reviews)</span>
              </div>
            </div>

            <div className="bg-yellow-200 p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-black text-xs mb-1 font-black uppercase">Price</p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-black text-black">{formatIDR(product.price)}</p>
                {product.originalPrice && (
                  <p className="text-lg text-black/70 line-through font-black">{formatIDR(product.originalPrice)}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-black text-black mb-2 uppercase tracking-wide">Description</h3>
              <p className="text-black leading-relaxed font-bold">{product.longDescription}</p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-black text-black mb-3 uppercase tracking-wide">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-black font-black mt-1">✓</span>
                    <span className="text-black font-bold">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stock Status */}
            <div>
              <p className={`font-black text-lg uppercase tracking-wide ${product.inStock ? "text-green-600" : "text-red-600"}`}>
                {product.inStock ? `In Stock (${product.stock} available)` : "Out of Stock"}
              </p>
            </div>

            {/* Quantity Selector and Add to Cart */}
            <div className="hidden md:flex items-center gap-4 pt-4">
              <div className="flex items-center border-4 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={decrementQuantity} className="p-3 text-black hover:bg-stone-100 transition border-r-2 border-black">
                  <Minus size={16} className="stroke-[3]" />
                </button>
                <span className="px-6 py-2 text-black font-black text-lg" aria-live="polite">{quantity}</span>
                <button onClick={incrementQuantity} className="p-3 text-black hover:bg-stone-100 transition border-l-2 border-black">
                  <Plus size={16} className="stroke-[3]" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`flex-1 flex items-center justify-center gap-2 px-8 py-3.5 border-4 border-black font-black uppercase transition-all duration-100 ${
                  maxStock
                    ? "bg-orange-300 text-black shadow-none translate-x-[2px] translate-y-[2px]"
                    : addedToCart
                      ? "bg-green-300 text-black shadow-none translate-x-[2px] translate-y-[2px]"
                      : "bg-blue-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:bg-stone-300 disabled:cursor-not-allowed"
                }`}
              >
                <ShoppingCart size={18} className="stroke-[2.5]" />
                {maxStock ? "Max Stock!" : addedToCart ? "Added!" : "Add to Cart"}
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    router.push("/login")
                    return
                  }
                  if (!product) return
                  if (isFavorite) {
                    removeFromWishlist(product.id)
                  } else {
                    addToWishlist({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      rating: product.rating,
                      reviews: product.reviews,
                    })
                  }
                }}
                className={`p-3 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 ${
                  isFavorite ? "text-rose-500" : "text-black"
                }`}
              >
                <Heart size={20} className="stroke-[2.5]" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t-4 border-black pt-12">
          <h2 className="text-2xl font-black text-black mb-8 uppercase tracking-wide">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-black text-black">{review.author}</p>
                        <p className="text-xs text-black/70 font-bold">
                          {new Date(review.date).toLocaleString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < review.rating ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <h4 className="font-black text-black mb-2 uppercase text-sm">{review.title}</h4>
                    <p className="text-black text-sm mb-4 font-bold">{review.comment}</p>
                  </div>
                  <button
                    className="flex items-center justify-center gap-2 font-black text-xs border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-stone-100 transition-all max-w-max uppercase"
                    onClick={async () => {
                      try {
                        if (!isSupabaseConfigured()) {
                          setReviews((prev) =>
                            prev.map((r) =>
                              r.id === review.id
                                ? {
                                    ...r,
                                    helpful: Math.max(0, (r.helpful || 0) + (r.liked ? -1 : 1)),
                                    liked: !r.liked,
                                  }
                                : r
                            )
                          )
                          return
                        }
                        const res = await supabase.rpc("toggle_review_helpful", { p_review_id: String(review.id) })
                        if (res.error) {
                          console.warn("⚠️ toggle_review_helpful RPC not available:", res.error.message)
                          // Fallback: update locally without backend sync
                          setReviews((prev) =>
                            prev.map((r) =>
                              r.id === review.id
                                ? {
                                    ...r,
                                    helpful: Math.max(0, (r.helpful || 0) + (r.liked ? -1 : 1)),
                                    liked: !r.liked,
                                  }
                                : r
                            )
                          )
                          return
                        }
                        const payload = Array.isArray(res.data) ? res.data[0] : res.data
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === review.id
                              ? { ...r, helpful: Number(payload?.helpful_count ?? r.helpful), liked: Boolean(payload?.liked) }
                              : r
                          )
                        )
                      } catch (e) {
                        console.error("helpful failed", e)
                      }
                    }}
                  >
                    <ThumbsUp size={14} className="stroke-[2.5]" />
                    {review.liked ? "Helpful (You)" : `Helpful (${review.helpful})`}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-black text-center py-8 font-black uppercase">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t-4 border-black">
            <h2 className="text-2xl font-black text-black mb-8 uppercase tracking-wide">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/product/${relatedProduct.id}`}
                  className="bg-white border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 group"
                >
                  <div className="overflow-hidden bg-stone-100 border-b-4 border-black">
                    <img
                      src={relatedProduct.image || "/placeholder.svg"}
                      alt={relatedProduct.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-black mb-1 line-clamp-1 group-hover:underline decoration-2 transition-all text-base uppercase">{relatedProduct.name}</h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(relatedProduct.rating) ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" : "text-gray-200"}
                        />
                      ))}
                      <span className="text-xs text-black font-black ml-1">({relatedProduct.rating})</span>
                    </div>
                    <p className="text-base font-black text-black bg-yellow-200 border-2 border-black px-2 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-block">{formatIDR(relatedProduct.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Mobile sticky add-to-cart bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t-4 border-black bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button onClick={decrementQuantity} className="p-2 text-black hover:bg-stone-100 transition">
              <Minus size={18} />
            </button>
            <span className="px-4 py-1 text-black font-black" aria-live="polite">{quantity}</span>
            <button onClick={incrementQuantity} className="p-2 text-black hover:bg-stone-100 transition">
              <Plus size={18} />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={`flex-1 text-center py-3 border-2 border-black font-black uppercase transition ${
              maxStock
                ? "bg-orange-300 text-black"
                : addedToCart
                  ? "bg-green-300 text-black"
                  : "bg-blue-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            }`}
          >
            {maxStock ? "Max!" : addedToCart ? "Added!" : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  )
}
