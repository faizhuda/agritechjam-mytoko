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
  // Validation state for shipping fields
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  })
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
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast?.error?.('Please upload an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast?.error?.('File size must be less than 5MB')
        return
      }
      setPaymentProof(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPaymentProof = async (orderId: string): Promise<string | null> => {
    if (!paymentProof) return null
    
    try {
      setUploading(true)
      const fileExt = paymentProof.name.split('.').pop()
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabaseBrowser.storage
        .from('payment-proofs')
        .upload(filePath, paymentProof, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabaseBrowser.storage
        .from('payment-proofs')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error: any) {
      console.error('Upload error:', error)
      toast?.error?.(`Failed to upload payment proof: ${error.message}`)
      return null
    } finally {
      setUploading(false)
    }
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
    if (step === 1) {
      // Validate required fields (not blank, not just spaces)
      type Field = "email" | "firstName" | "lastName" | "phone" | "address" | "city" | "zipCode"
      const requiredFields: Field[] = ["email", "firstName", "lastName", "phone", "address", "city", "zipCode"]
      const errors: Record<Field, string> = {
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        city: "",
        zipCode: "",
      }
      let hasError = false
      requiredFields.forEach((field) => {
        const value = formData[field]
        if (!value || !value.trim()) {
          errors[field] = "Field is required"
          hasError = true
        } else {
          errors[field] = ""
        }
      })
      setFieldErrors(errors)
      if (hasError) return
      setStep(step + 1)
      return
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (cartItems.length === 0) {
      toast?.error?.("Your cart is empty")
      return
    }
    // Validate payment proof is uploaded (mandatory)
    if (!paymentProof) {
      toast?.error?.("Please upload payment proof before placing order")
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
      const newOrderId = data?.orderId ? String(data.orderId) : null
      if (newOrderId) setOrderId(newOrderId)
      if (data?.orderNumber) setOrderNumber(String(data.orderNumber))
      
      // Upload payment proof (mandatory)
      if (paymentProof && newOrderId && isSupabaseConfigured()) {
        const proofUrl = await uploadPaymentProof(newOrderId)
        if (!proofUrl) {
          // Upload failed - show error but still allow order to go through
          toast?.error?.('Payment proof upload failed. Please upload via dashboard later.')
        } else {
          // Update order with payment proof URL
          const { error: updateErr } = await supabaseBrowser
            .from('orders')
            .update({ payment_proof_url: proofUrl })
            .eq('id', newOrderId)
          
          if (updateErr) {
            console.error('Failed to update order with payment proof:', updateErr)
            toast?.error?.('Payment proof uploaded but failed to link to order')
          } else {
            toast?.success?.('Payment proof uploaded successfully')
          }
        }
      }
      
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
    toast?.success?.("Quantities have been adjusted to available stock")
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
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md w-full bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <CheckCircle size={64} className="mx-auto mb-6 text-black stroke-[2.5]" />
            <h1 className="text-3xl font-black mb-4 text-black uppercase tracking-tight">Order Confirmed!</h1>
            <p className="text-black mb-6 text-base font-bold">
              Thank you for your purchase. Your order has been placed successfully.
            </p>
            <div className="bg-stone-100 border-2 border-black p-3 mb-8 font-black uppercase text-xs text-left space-y-1">
              <p className="text-black">Order ID: <span className="underline">{orderId ?? "-"}</span></p>
              <p className="text-black">Order Number: <span className="underline">{orderNumber ?? "-"}</span></p>
            </div>
            <div className="space-y-4">
              <Link
                href={orderId ? `/invoice?orderId=${orderId}` : "/invoice"}
                className="block w-full text-center px-6 py-3 bg-cyan-200 border-2 border-black text-black rounded-none font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
              >
                View Invoice
              </Link>
              <Link
                href="/dashboard"
                className="block w-full text-center px-6 py-3 bg-yellow-200 border-2 border-black text-black rounded-none font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
              >
                View Dashboard
              </Link>
              <Link
                href="/catalog"
                className="block w-full text-center px-6 py-3 bg-white border-2 border-black text-black rounded-none font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-black mb-8 text-black uppercase tracking-tight">Checkout</h1>

        {/* Progress Steps */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 border-2 border-black rounded-none flex items-center justify-center font-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  s <= step ? "bg-yellow-200 text-black" : "bg-white text-black"
                }`}
              >
                {s}
              </div>
              <span className="text-sm font-black text-black uppercase tracking-wider">
                {s === 1 ? "Shipping" : s === 2 ? "Billing" : "Payment"}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form id="checkout-form" onSubmit={handleSubmit} className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-2">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight">Shipping Info</h2>
                    {signedIn && (
                      <button
                        type="button"
                        onClick={fillFromProfile}
                        className="text-black font-black underline hover:text-blue-600 transition-colors uppercase text-xs"
                      >
                        Use my profile
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-black mb-1 uppercase">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.email ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                      required
                    />
                    {fieldErrors.email && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.email}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-black mb-1 uppercase">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.firstName ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                        required
                      />
                      {fieldErrors.firstName && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-black text-black mb-1 uppercase">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.lastName ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                        required
                      />
                      {fieldErrors.lastName && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-black mb-1 uppercase">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="08123456789"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.phone ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                      required
                    />
                    {fieldErrors.phone && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-black mb-1 uppercase">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Street Address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.address ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                      required
                    />
                    {fieldErrors.address && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-black mb-1 uppercase">City</label>
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.city ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                        required
                      />
                      {fieldErrors.city && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-black text-black mb-1 uppercase">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="ZIP Code"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${fieldErrors.zipCode ? 'border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]' : 'border-black'}`}
                        required
                      />
                      {fieldErrors.zipCode && <p className="text-red-600 text-xs font-bold mt-2 uppercase">{fieldErrors.zipCode}</p>}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-black mb-6 text-black uppercase tracking-tight border-b-2 border-black pb-2">Billing Information</h2>
                  <p className="text-black mb-4 font-bold uppercase text-sm">Same as shipping address</p>
                  <div className="bg-yellow-50 p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
                    <p className="font-black text-black text-lg">
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
                <div className="space-y-6">
                  <h2 className="text-2xl font-black mb-6 text-black uppercase tracking-tight border-b-2 border-black pb-2">Payment Method</h2>
                  <p className="text-base text-black mb-4 font-bold uppercase">QRIS Payment</p>
                  <div className="bg-stone-100 p-6 border-4 border-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="max-w-xs mx-auto bg-white rounded-none border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {/* QRIS Header */}
                      <div className="bg-rose-300 px-4 py-3 text-center border-b-4 border-black">
                        <span className="text-black font-black tracking-widest text-lg">QRIS</span>
                        <p className="text-[9px] text-black font-black -mt-1 uppercase tracking-wider">Quick Response Code Indonesian Standard</p>
                      </div>
                      
                      <div className="p-6 flex flex-col items-center justify-center">
                        <div className="p-3 bg-yellow-100 border-2 border-black mb-4">
                          <svg viewBox="0 0 100 100" className="w-44 h-44" fill="none">
                            {/* Corner 1 */}
                            <path d="M5,5 h25 v25 h-25 z M10,10 h15 v15 h-15 z" fill="black" />
                            {/* Corner 2 */}
                            <path d="M70,5 h25 v25 h-25 z M75,10 h15 v15 h-15 z" fill="black" />
                            {/* Corner 3 */}
                            <path d="M5,70 h25 v25 h-25 z M10,75 h15 v15 h-15 z" fill="black" />
                            {/* Alignment pattern */}
                            <path d="M70,70 h10 v10 h-10 z M74,74 h2 v2 h-2 z" fill="black" />
                            {/* Random code bits */}
                            <path d="M35,5 h10 v10 h-10 z M50,10 h10 v10 h-10 z M35,25 h10 v10 h-10 z M55,25 h10 v10 h-10 z M45,45 h10 v10 h-10 z M35,60 h10 v10 h-10 z M60,45 h10 v10 h-10 z M50,65 h15 v10 h-15 z M10,35 h15 v10 h-15 z M25,50 h10 v10 h-10 z M75,35 h15 v10 h-15 z M80,50 h10 v15 h-10 z" fill="black" />
                            {/* Center square accent */}
                            <rect x="44" y="44" width="12" height="12" fill="white" />
                            <rect x="46" y="46" width="8" height="8" fill="black" />
                          </svg>
                        </div>
                        <p className="text-sm font-black text-black uppercase">GOPAY / OVO / DANA / LinkAja</p>
                        <p className="text-xs text-black font-bold mt-1">NMID: ID1020304050607</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-black text-center mt-4 font-bold uppercase">
                    This is a demo. Please upload your payment transfer receipt below.
                  </p>
                  
                  {/* Payment Proof Upload */}
                  <div className="border-t-4 border-black pt-6">
                    <h3 className="text-lg font-black text-black mb-2 uppercase tracking-tight">Upload Payment Proof <span className="text-red-500">*</span></h3>
                    <p className="text-sm text-black mb-4 font-bold">Upload a screenshot or photo of your payment confirmation</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label 
                          htmlFor="payment-proof" 
                          className={`flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-black rounded-none cursor-pointer transition-all ${
                            paymentProof 
                              ? 'border-black bg-green-100 shadow-none translate-x-[3px] translate-y-[3px]' 
                              : 'border-black bg-stone-50 hover:bg-stone-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {paymentProof ? (
                              <svg className="w-8 h-8 mb-2 text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 mb-2 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            )}
                            {paymentProof ? (
                              <>
                                <p className="mb-1 text-sm text-black font-black uppercase">
                                  Receipt uploaded!
                                </p>
                                <p className="text-xs text-black font-bold">Click to change file</p>
                              </>
                            ) : (
                              <>
                                <p className="mb-1 text-sm text-black font-black uppercase">
                                  Click to upload receipt
                                </p>
                                <p className="text-xs text-black font-bold">PNG, JPG or JPEG (MAX. 5MB)</p>
                                <p className="text-xs text-red-500 font-bold mt-1">* Required</p>
                              </>
                            )}
                          </div>
                          <input 
                            id="payment-proof" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      
                      {paymentProofPreview && (
                        <div className="mt-4 border-2 border-black p-4 bg-stone-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <p className="text-sm text-black font-black mb-2 uppercase">Preview:</p>
                          <div className="relative w-full max-w-xs mx-auto">
                            <img 
                              src={paymentProofPreview} 
                              alt="Payment proof preview" 
                              className="w-full h-auto rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentProof(null)
                                setPaymentProofPreview(null)
                              }}
                              className="absolute top-2 right-2 bg-red-400 text-black border-2 border-black rounded-none p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                              <svg className="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-center text-black mt-4 font-black break-all">
                            {paymentProof?.name} ({(paymentProof!.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-8">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 px-6 py-3 border-2 border-black bg-white hover:bg-stone-50 text-black rounded-none font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={placing || uploading || (step === 3 && !paymentProof)}
                  className="flex-1 px-6 py-3 bg-blue-300 border-2 border-black text-black rounded-none font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  title={step === 3 && !paymentProof ? "Please upload payment proof first" : ""}
                >
                  {step === 3 ? (placing || uploading ? (uploading ? "Uploading..." : "Placing...") : "Place Order") : "Continue"}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none sticky top-20">
              <h2 className="text-xl font-black mb-6 text-black uppercase tracking-tight border-b-2 border-black pb-2">Order Summary</h2>
              <div className="space-y-3 mb-6 pb-6 border-b-2 border-black">
                {cartItems.length === 0 ? (
                  <p className="text-sm text-black font-bold uppercase">Your cart is empty.</p>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-black font-bold">
                      <span>
                        {item.name} <span className="font-black">x{item.quantity}</span>
                      </span>
                      <span className="font-black">{formatIDR(item.price * item.quantity)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-black font-bold">
                  <span className="uppercase text-xs tracking-wider">Subtotal</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-black font-bold">
                  <span className="uppercase text-xs tracking-wider">Tax (10%)</span>
                  <span>{formatIDR(tax)}</span>
                </div>
                <div className="flex justify-between text-sm text-black font-bold">
                  <span className="uppercase text-xs tracking-wider">Shipping</span>
                  <span>{formatIDR(shippingFee)}</span>
                </div>
                <div className="border-t-2 border-black pt-3 flex justify-between items-center font-bold text-black">
                  <span className="uppercase tracking-wider">Total</span>
                  <span className="text-xl font-black text-black bg-yellow-200 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{formatIDR(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Stock limit dialog */}
      <AlertDialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl text-black uppercase tracking-tight">Quantity Exceeds Stock</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black text-sm">
              Some items in your cart exceed available stock. Please adjust quantities before checkout:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-2 text-sm border-2 border-black p-3 bg-stone-50">
            {stockViolations.map((v) => (
              <div key={v.id} className="flex justify-between font-bold text-black">
                <span>{v.name}</span>
                <span className="font-black">
                  Wanted: {v.wanted} • Stock: {v.available}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-2 border-black rounded-none font-bold uppercase">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={adjustQuantitiesToAvailable}
              className="bg-blue-300 text-black border-2 border-black rounded-none font-black uppercase hover:bg-blue-400"
            >
              Adjust To Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Mobile sticky action bar */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-4 border-black bg-white shadow-[0_-4px_0_0_rgba(0,0,0,0.1)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-black font-black uppercase">Total</p>
              <p className="text-lg font-black text-black">{formatIDR(cartTotal)}</p>
            </div>
            <button
              form="checkout-form"
              type="submit"
              disabled={placing || uploading || (step === 3 && !paymentProof)}
              className="flex-1 text-center bg-blue-300 text-black py-3 border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step === 3 ? (placing || uploading ? "Placing..." : "Place Order") : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
