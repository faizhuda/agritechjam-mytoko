"use client"

import { Trash2, Plus, Minus } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/lib/cart-context"
import { useRef } from "react"
import { fetchProductsByIds } from "@/lib/db/products"
import { formatIDR } from "@/lib/utils"

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart } = useCart()
  const stockCache = useRef<Map<number, number>>(new Map())

  const ensureStock = async (id: number): Promise<number> => {
    if (stockCache.current.has(id)) return stockCache.current.get(id)!
    try {
      const items = await fetchProductsByIds([id])
      const stock = Number(items?.[0]?.stock ?? 0)
      stockCache.current.set(id, stock)
      return stock
    } catch {
      return Infinity
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.1
  const shippingFee = subtotal > 0 ? 10000 : 0
  const total = subtotal + tax + shippingFee

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-black mb-8 text-black uppercase tracking-tight">Shopping Cart</h1>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-6 border-b-4 border-black last:border-b-0">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-24 h-24 object-cover border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    />
                    <div className="flex-1">
                      <h3 className="font-black text-lg mb-2 text-black uppercase tracking-tight">{item.name}</h3>
                      <div className="mb-4">
                        <span className="text-black font-black text-sm bg-yellow-300 border-2 border-black px-2 py-0.5 inline-block shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                          {formatIDR(item.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 border-2 border-black rounded-none bg-white hover:bg-stone-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black font-black"
                        >
                          <Minus size={16} className="stroke-[2.5]" />
                        </button>
                        <span className="w-8 text-center font-black text-black">{item.quantity}</span>
                        <button
                          onClick={async () => {
                            const stock = await ensureStock(item.id)
                            const next = Math.min(item.quantity + 1, Number.isFinite(stock) ? stock : item.quantity + 1)
                            if (next !== item.quantity) updateQuantity(item.id, next)
                          }}
                          className="p-1.5 border-2 border-black rounded-none bg-white hover:bg-stone-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black font-black"
                        >
                          <Plus size={16} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                    <div className="flex sm:flex-col justify-between items-center sm:items-end">
                      <p className="font-black text-lg text-black">{formatIDR(item.price * item.quantity)}</p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 border-2 border-black rounded-none bg-red-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black"
                      >
                        <Trash2 size={20} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/catalog" className="inline-block mt-6 text-black font-black underline hover:text-blue-600 transition-colors">
                ← Continue Shopping
              </Link>
            </div>

            {/* Order Summary (desktop) */}
            <div className="lg:col-span-1">
              <div className="bg-white border-4 border-black p-6 sticky top-20 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                <h2 className="text-xl font-black mb-6 text-black uppercase tracking-tight border-b-2 border-black pb-2">Order Summary</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-black font-bold text-sm uppercase">Subtotal</span>
                    <span className="font-black text-black">{formatIDR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black font-bold text-sm uppercase">Tax (10%)</span>
                    <span className="font-black text-black">{formatIDR(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black font-bold text-sm uppercase">Shipping</span>
                    <span className="font-black text-black">{formatIDR(shippingFee)}</span>
                  </div>
                  <div className="border-t-2 border-black pt-4 flex justify-between items-center">
                    <span className="font-black text-black uppercase">Total</span>
                    <span className="text-xl font-black text-black bg-yellow-200 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {formatIDR(total)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="hidden lg:block w-full text-center bg-blue-300 text-black py-3 border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
            <p className="text-lg text-black font-black mb-6 uppercase">Your cart is empty</p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
      {/* Mobile sticky checkout bar */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-4 border-black bg-white shadow-[0_-4px_0_0_rgba(0,0,0,0.1)]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-black font-black uppercase">Total</p>
              <p className="text-lg font-black text-black">{formatIDR(total)}</p>
            </div>
            <Link
              href="/checkout"
              className="flex-1 text-center bg-blue-300 text-black py-3 border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
