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
                    className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {fieldErrors.email && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.email}</p>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {fieldErrors.firstName && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {fieldErrors.lastName && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {fieldErrors.phone && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.phone}</p>}
                  <input
                    type="text"
                    name="address"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.address ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {fieldErrors.address && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.address}</p>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {fieldErrors.city && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="ZIP Code"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${fieldErrors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {fieldErrors.zipCode && <p className="text-red-500 text-xs font-bold mt-1">{fieldErrors.zipCode}</p>}
                    </div>
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
                <div className="space-y-6">
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
                  
                  {/* Payment Proof Upload */}
                  <div className="border-t-2 border-gray-300 pt-6">
                    <h3 className="text-lg font-bold text-black mb-4">Upload Payment Proof <span className="text-red-500">*</span></h3>
                    <p className="text-sm text-black mb-4 font-bold">Upload a screenshot or photo of your payment confirmation (required)</p>
                    
                    <div className="space-y-4">
                      <label className="block">
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="payment-proof" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${paymentProof ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {paymentProof ? (
                                <svg className="w-8 h-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              {paymentProof ? (
                                <>
                                  <p className="mb-1 text-sm text-green-600 font-bold">
                                    Payment proof uploaded successfully!
                                  </p>
                                  <p className="text-xs text-gray-600 font-bold">Click to change file</p>
                                </>
                              ) : (
                                <>
                                  <p className="mb-1 text-sm text-gray-700 font-bold">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-600 font-bold">PNG, JPG or JPEG (MAX. 5MB)</p>
                                  <p className="text-xs text-red-500 font-bold mt-2">* Required</p>
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
                      </label>
                      
                      {paymentProofPreview && (
                        <div className="mt-4">
                          <p className="text-sm text-black font-bold mb-2">Preview:</p>
                          <div className="relative w-full max-w-xs mx-auto">
                            <img 
                              src={paymentProofPreview} 
                              alt="Payment proof preview" 
                              className="w-full h-auto rounded-lg border-2 border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentProof(null)
                                setPaymentProofPreview(null)
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-center text-black mt-2 font-bold">
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
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={placing || uploading || (step === 3 && !paymentProof)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  title={step === 3 && !paymentProof ? "Please upload payment proof first" : ""}
                >
                  {step === 3 ? (placing || uploading ? (uploading ? "Uploading..." : "Placing...") : "Place Order") : "Continue"}
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
            <AlertDialogTitle>Quantity Exceeds Available Stock</AlertDialogTitle>
            <AlertDialogDescription>
              Some items in your cart exceed available stock. Please adjust quantities before checkout:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-2 text-sm">
            {stockViolations.map((v) => (
              <div key={v.id} className="flex justify-between">
                <span className="font-medium text-black">{v.name}</span>
                <span className="text-black">
                  Requested {v.wanted} • Available {v.available}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
            <AlertDialogAction
              onClick={adjustQuantitiesToAvailable}
              className="bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Adjust To Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Mobile sticky action bar */}
  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t-2 border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
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
