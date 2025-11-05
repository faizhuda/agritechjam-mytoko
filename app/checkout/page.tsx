"use client"

import React, { useMemo, useState, useEffect } from "react"
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
import { formatIDR } from "@/lib/utils"

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
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Prefill from profile on first mount (when fields are empty)
  useEffect(() => {
    const loadProfile = async () => {
      if (!isSupabaseConfigured()) return setProfileLoaded(true)
      const { data: auth } = await supabaseBrowser.auth.getUser()
      const u = auth.user
      if (!u) return setProfileLoaded(true)
      setSignedIn(true)
      const { data: prof } = await supabaseBrowser
        .from("profiles")
        .select("full_name, first_name, last_name, phone, address, city, zip_code")
        .eq("id", u.id)
        .maybeSingle()
      const p: any = prof || {}
      const email = u.email ?? ""
      const first = (p.first_name as string) || (p.full_name ? String(p.full_name).split(" ")[0] : "")
      const last = (p.last_name as string) || (p.full_name ? String(p.full_name).split(" ").slice(1).join(" ") : "")
      const next = {
        email,
        firstName: first,
        lastName: last,
        phone: p.phone ?? "",
        address: p.address ?? "",
        city: p.city ?? "",
        zipCode: p.zip_code ?? "",
        cardName: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
      }
      setHasProfile(Boolean(first || last || p.phone || p.address || p.city || p.zip_code))
      // Only prefill fields that are empty, so we don't override user edits
      setFormData((prev) => ({
        ...prev,
        email: prev.email || next.email,
        firstName: prev.firstName || next.firstName,
        lastName: prev.lastName || next.lastName,
        phone: prev.phone || next.phone,
        address: prev.address || next.address,
        city: prev.city || next.city,
        zipCode: prev.zipCode || next.zipCode,
      }))
      setProfileLoaded(true)
    }
    loadProfile()
  }, [])

  const fillFromProfile = async () => {
    if (!isSupabaseConfigured()) return
    const { data: auth } = await supabaseBrowser.auth.getUser()
    const u = auth.user
    if (!u) return
    const { data: prof } = await supabaseBrowser
      .from("profiles")
      .select("full_name, first_name, last_name, phone, address, city, zip_code")
      .eq("id", u.id)
      .maybeSingle()
    const p: any = prof || {}
    const email = u.email ?? ""
    const first = (p.first_name as string) || (p.full_name ? String(p.full_name).split(" ")[0] : "")
    const last = (p.last_name as string) || (p.full_name ? String(p.full_name).split(" ").slice(1).join(" ") : "")
    setFormData((prev) => ({
      ...prev,
      email,
      firstName: first,
      lastName: last,
      phone: p.phone ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      zipCode: p.zip_code ?? "",
    }))
    toast?.success?.("Shipping info filled from your profile")
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
      const { data: sessionData } = isSupabaseConfigured() ? await supabaseBrowser.auth.getSession() : { data: null as any }
      const token = sessionData?.session?.access_token
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      if (data?.orderNumber) setOrderNumber(String(data.orderNumber))
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
  const shippingFee = useMemo(() => (subtotal > 0 ? 10000 : 0), [subtotal])
  const cartTotal = useMemo(() => subtotal + tax + shippingFee, [subtotal, tax, shippingFee])

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
            <p className="text-sm text-black mb-1 font-bold">Order ID: {orderId ?? "-"}</p>
            <p className="text-sm text-black mb-8 font-bold">Order Number: {orderNumber ?? "-"}</p>
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
            <form id="checkout-form" onSubmit={handleSubmit} className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-black">Shipping Information</h2>
                    {signedIn && (
                      <button
                        type="button"
                        onClick={fillFromProfile}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Use my profile
                      </button>
                    )}
                  </div>
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
                      <span>{formatIDR(item.price * item.quantity)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Subtotal</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Tax (10%)</span>
                  <span>{formatIDR(tax)}</span>
                </div>
                <div className="flex justify-between text-sm text-black font-bold">
                  <span>Shipping</span>
                  <span>{formatIDR(shippingFee)}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between font-bold text-black">
                  <span>Total</span>
                  <span className="text-blue-600 text-lg">{formatIDR(cartTotal)}</span>
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
      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-2 border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-600 font-semibold">Total</p>
            <p className="text-lg font-bold text-blue-600">{formatIDR(cartTotal)}</p>
          </div>
          <button
            form="checkout-form"
            type="submit"
            disabled={placing}
            className="flex-1 text-center bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {step === 3 ? (placing ? "Placing..." : "Place Order") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
