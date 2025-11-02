"use client"

import Link from "next/link"
import { Star, ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatIDR } from "@/lib/utils"
import { useState } from "react"
import type { Product } from "@/lib/product-data"

export default function FeaturedProductsClient({ products }: { products: Product[] }) {
  const { addToCart } = useCart()
  const [addedItem, setAddedItem] = useState<number | null>(null)

  const handleAddToCart = (product: Product) => {
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
                <h3 className="font-bold text-lg mb-2 text-black hover:text-blue-600 cursor-pointer transition">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < Math.floor(product.rating ?? 0) ? "fill-red-600 text-red-600" : "text-gray-300"}
                  />
                ))}
                <span className="text-sm text-black font-semibold ml-2">({product.rating ?? 0})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-blue-600">{formatIDR(product.price)}</span>
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
    </section>
  )
}
