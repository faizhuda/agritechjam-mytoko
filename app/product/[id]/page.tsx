"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Heart, ThumbsUp } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import type { Product, Review } from "@/lib/product-data"
import { fetchProductById, fetchProducts, fetchReviewsByProductId } from "@/lib/db/products"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const { addToCart } = useCart()
  const [addedToCart, setAddedToCart] = useState(false)

  const { id } = use(params)
  const productId = Number.parseInt(id)
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [p, all, rs] = await Promise.all([
        fetchProductById(productId),
        fetchProducts(),
        fetchReviewsByProductId(productId),
      ])
      if (!mounted) return
      setProduct(p)
      setReviews(rs)
      if (p) {
        setRelatedProducts(all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4))
      }
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [productId])

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

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const incrementQuantity = () => setQuantity(quantity + 1)
  const decrementQuantity = () => quantity > 1 && setQuantity(quantity - 1)
  // relatedProducts prepared from fetched list above

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition mb-8 font-bold"
        >
          <ArrowLeft size={20} />
          Back to Catalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Product Image */}
          <div className="flex items-center justify-center bg-white rounded-xl shadow-lg p-8 border-2 border-gray-300">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-black mb-4">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.floor(product.rating) ? "fill-red-600 text-red-600" : "text-gray-300"}
                    />
                  ))}
                </div>
                <span className="text-black font-bold">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-600">
              <p className="text-black text-sm mb-2 font-bold">Price</p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold text-blue-600">${product.price}</p>
                {product.originalPrice && (
                  <p className="text-lg text-black line-through font-bold">${product.originalPrice}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-bold text-black mb-2">Description</h3>
              <p className="text-black leading-relaxed font-semibold">{product.longDescription}</p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">✓</span>
                    <span className="text-black font-semibold">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stock Status */}
            <div>
              <p className={`font-bold text-lg ${product.inStock ? "text-green-600" : "text-red-600"}`}>
                {product.inStock ? `In Stock (${product.stock} available)` : "Out of Stock"}
              </p>
            </div>

            {/* Quantity Selector and Add to Cart */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border-2 border-gray-300 rounded-lg">
                <button onClick={decrementQuantity} className="p-3 text-black hover:bg-gray-100 transition">
                  <Minus size={20} />
                </button>
                <span className="px-6 py-2 text-black font-bold text-lg">{quantity}</span>
                <button onClick={incrementQuantity} className="p-3 text-black hover:bg-gray-100 transition">
                  <Plus size={20} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold transition ${
                  addedToCart
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                }`}
              >
                <ShoppingCart size={20} />
                {addedToCart ? "Added to Cart!" : "Add to Cart"}
              </button>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-3 rounded-lg border-2 transition ${
                  isFavorite
                    ? "bg-red-600 text-white border-red-600"
                    : "border-gray-300 text-black hover:border-red-600"
                }`}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-gray-300 pt-12">
          <h2 className="text-2xl font-bold text-black mb-8">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-black">{review.author}</p>
                      <p className="text-sm text-black font-semibold">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <h4 className="font-bold text-black mb-2">{review.title}</h4>
                  <p className="text-black text-sm mb-4 font-semibold">{review.comment}</p>
                  <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm">
                    <ThumbsUp size={16} />
                    Helpful ({review.helpful})
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-black text-center py-8 font-bold">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t-2 border-gray-300">
            <h2 className="text-2xl font-bold text-black mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/product/${relatedProduct.id}`}
                  className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:scale-105"
                >
                  <img
                    src={relatedProduct.image || "/placeholder.svg"}
                    alt={relatedProduct.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-black mb-2 line-clamp-2">{relatedProduct.name}</h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={`${
                            i < Math.floor(relatedProduct.rating) ? "fill-red-600 text-red-600" : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-black font-bold ml-1">({relatedProduct.rating})</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">${relatedProduct.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
