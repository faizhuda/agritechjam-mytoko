"use client"

import { Trash2, Plus, Minus } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/lib/cart-context"
import { formatIDR } from "@/lib/utils"

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart } = useCart()

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.1
  const total = subtotal + tax

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-black text-balance">Shopping Cart</h1>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 p-6 border-b border-gray-300 last:border-b-0">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 text-black">{item.name}</h3>
                      <p className="text-blue-600 font-bold mb-4">{formatIDR(item.price)}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 border-2 border-gray-300 rounded hover:bg-gray-100 transition text-black font-bold"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-bold text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 border-2 border-gray-300 rounded hover:bg-gray-100 transition text-black font-bold"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold mb-4 text-black">{formatIDR(item.price * item.quantity)}</p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition font-bold"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/catalog" className="inline-block mt-6 text-blue-600 hover:underline font-bold">
                ← Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6 sticky top-20 shadow-lg">
                <h2 className="text-xl font-bold mb-6 text-black">Order Summary</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-black font-bold">Subtotal</span>
                    <span className="font-bold text-black">{formatIDR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black font-bold">Tax (10%)</span>
                    <span className="font-bold text-black">{formatIDR(tax)}</span>
                  </div>
                  <div className="border-t-2 border-gray-300 pt-4 flex justify-between">
                    <span className="font-bold text-black">Total</span>
                    <span className="text-xl font-bold text-blue-600">{formatIDR(total)}</span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="w-full block text-center bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-black font-bold mb-6">Your cart is empty</p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
