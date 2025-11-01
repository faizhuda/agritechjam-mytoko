"use client"

import type React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CheckoutPage() {
  const { cartItems, clearCart, updateQuantity, removeFromCart } = useCart()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    cardName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const [placing, setPlacing] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [stockViolations, setStockViolations] = useState<
    Array<{ id: number; name: string; wanted: number; available: number }>
  >([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (cartItems.length === 0) {
      toast?.error?.("Your cart is empty")
      return
    }
    // Pre-flight: check stock levels client-side to show a friendly popup
    if (isSupabaseConfigured() && cartItems.length > 0) {
      try {
        const ids = cartItems.map((i) => i.id)
        const { data, error } = await supabaseBrowser
          .from("products")
          .select("id, name, stock")
          .in("id", ids)

        if (!error && Array.isArray(data)) {
          const byId = new Map<number, { stock: number; name: string }>()
          data.forEach((p: any) => byId.set(Number(p.id), { stock: Number(p.stock ?? 0), name: String(p.name) }))
          const violations: Array<{ id: number; name: string; wanted: number; available: number }> = []
          for (const item of cartItems) {
            const rec = byId.get(item.id)
            const available = rec ? rec.stock : 0
            if (item.quantity > available) {
              violations.push({ id: item.id, name: rec?.name ?? `Product #${item.id}`, wanted: item.quantity, available })
            }
          }
          if (violations.length > 0) {
            setStockViolations(violations)
            setStockDialogOpen(true)
            return
          }
        }
      } catch (err) {
        // If stock check fails for any reason, continue to server-side validation
        console.warn("stock pre-check failed, proceeding to server validation", err)
      }
    }
    try {
      setPlacing(true)
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to place order")
      }
      // Success
      if (data?.orderId) setOrderId(String(data.orderId))
      clearCart()
      setOrderPlaced(true)
    } catch (err: any) {
      console.error("place order error", err)
      toast?.error?.(String(err.message || err))
    } finally {
      setPlacing(false)
    }
  }

  const adjustQuantitiesToAvailable = () => {
    for (const v of stockViolations) {
      if (v.available <= 0) {
        removeFromCart(v.id)
      } else {
        updateQuantity(v.id, v.available)
      }
    }
    setStockDialogOpen(false)
    toast?.success?.("Kuantitas sudah disesuaikan dengan stok yang tersedia")
  }

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )
  const tax = useMemo(() => subtotal * 0.1, [subtotal])
  const cartTotal = useMemo(() => subtotal + tax, [subtotal, tax])

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 border-2 border-gray-300">
            <CheckCircle size={64} className="mx-auto mb-6 text-blue-600" />
            <h1 className="text-3xl font-bold mb-4 text-black">Order Placed Successfully!</h1>
            <p className="text-black mb-6 text-base font-bold">
              Thank you for your purchase. Your order has been confirmed.
            </p>
            <p className="text-sm text-black mb-8 font-bold">Order ID: {orderId ?? "-"}</p>
            <div className="space-y-3">
              <Link
                href={orderId ? `/invoice?orderId=${orderId}` : "/invoice"}
                className="block px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                View Invoice
              </Link>
              <Link
                href="/dashboard"
                className="block px-6 py-3 bg-gray-200 text-black rounded-lg font-bold hover:bg-gray-300 transition"
              >
                View Dashboard
              </Link>
              <Link
                href="/catalog"
                className="block px-6 py-3 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-black">Checkout</h1>

        {/* Progress Steps */}
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors border-2 ${
                  s <= step ? "bg-blue-600 text-white border-blue-600" : "bg-white text-black border-gray-300"
                }`}
              >
                {s}
              </div>
              <span className={`text-sm font-bold hidden sm:inline ${s <= step ? "text-black" : "text-black"}`}>
                {s === 1 ? "Shipping" : s === 2 ? "Billing" : "Payment"}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold mb-6 text-black">Shipping Information</h2>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    name="address"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="ZIP Code"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold mb-6 text-black">Billing Information</h2>
                  <p className="text-black mb-4 font-bold">Same as shipping address</p>
                  <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
                    <p className="font-bold text-black">
                      {formData.firstName} {formData.lastName}
                    </p>
                    <p className="text-sm text-black mt-2 font-bold">{formData.address}</p>
                    <p className="text-sm text-black font-bold">
                      {formData.city}, {formData.zipCode}
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold mb-6 text-black">Payment Method</h2>
                  <p className="text-base text-black mb-4 font-bold">QRIS Payment</p>
                  <div className="bg-gray-50 p-8 rounded-lg border-2 border-gray-300 text-center">
                    <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-black mb-2 font-bold">QR Code</p>
                        <p className="text-xs text-black font-bold">Scan with your mobile banking app</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-black text-center mt-4 font-bold">
                    This is a demo. In production, integrate with a QRIS payment provider.
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-8">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={placing}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {step === 3 ? (placing ? "Placing..." : "Place Order") : "Continue"}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg sticky top-20">
              <h2 className="text-xl font-bold mb-6 text-black">Order Summary</h2>
              <div className="space-y-3 mb-6 pb-6 border-b-2 border-gray-300">
                {cartItems.length === 0 ? (
                  <p className="text-sm text-black font-bold">Your cart is empty.</p>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-black font-bold">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between font-bold text-black">
                  <span>Total</span>
                  <span className="text-blue-600 text-lg">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Stock limit dialog */}
      <AlertDialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jumlah melebihi stok tersedia</AlertDialogTitle>
            <AlertDialogDescription>
              Beberapa item di keranjang melebihi stok. Sesuaikan kuantitas sebelum checkout:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-2 text-sm">
            {stockViolations.map((v) => (
              <div key={v.id} className="flex justify-between">
                <span className="font-medium text-black">{v.name}</span>
                <span className="text-black">
                  minta {v.wanted} • stok {v.available}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Oke</AlertDialogCancel>
            <AlertDialogAction onClick={adjustQuantitiesToAvailable}>
              Sesuaikan ke stok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
