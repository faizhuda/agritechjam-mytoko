"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  Document,
  Page as PDFPage,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
} from "@react-pdf/renderer"
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser"
import { useToast } from "@/hooks/use-toast"
import { formatIDR } from "@/lib/utils"

type InvoiceItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

type InvoiceCustomer = {
  name: string
  email: string
  phone: string
  address: string
  city: string
  zipCode: string
}

type InvoiceData = {
  orderNumber: string
  invoiceDate: string
  dueDate: string
  status: string
  customer: InvoiceCustomer
  items: InvoiceItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  paymentMethod: string
  transactionId: string
  paymentProofUrl: string | null
  paymentProofBase64?: string | null
}

export default function InvoiceClient() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const from = searchParams.get("from")
  const backTo = from === "admin" ? "/admin" : "/dashboard"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      setError(null)
      setLoading(true)

      try {
        if (!orderId) {
          setError("Order ID not found. Open the invoice from Checkout or your Order History.")
          setLoading(false)
          return
        }

        if (!isSupabaseConfigured()) {
          setError("Supabase is not configured.")
          setLoading(false)
          return
        }

        const supabase = supabaseBrowser

        // ambil order
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle()

        if (orderErr || !order) {
          setError("Order not found.")
          setLoading(false)
          return
        }

        // Determine customer based on the order's owner first (so invoice shows purchaser info)
        let customer: InvoiceCustomer = {
          name: "Customer",
          email: "",
          phone: "",
          address: "",
          city: "",
          zipCode: "",
        }

        try {
          // Try to load profile for the user who created the order
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, full_name, phone, address, city, zip_code")
            .eq("id", order.user_id)
            .maybeSingle()

          if (ownerProfile) {
            const first = ownerProfile.first_name || (ownerProfile.full_name ? String(ownerProfile.full_name).split(" ")[0] : "")
            const last = ownerProfile.last_name || (ownerProfile.full_name ? String(ownerProfile.full_name).split(" ").slice(1).join(" ") : "")
            customer = {
              name: `${first} ${last}`.trim() || ownerProfile.full_name || "Customer",
              email: "",
              phone: ownerProfile.phone ?? "",
              address: ownerProfile.address ?? "",
              city: ownerProfile.city ?? "",
              zipCode: ownerProfile.zip_code ?? "",
            }
          } else {
            // Fallback: if we are the authenticated user (viewer), use our profile/email
            try {
              const { data: authData } = await supabase.auth.getUser()
              const authedEmail = authData.user?.email ?? ""
              if (authData.user) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("first_name, last_name, full_name, phone, address, city, zip_code")
                  .eq("id", authData.user.id)
                  .maybeSingle()

                if (profile) {
                  const first = profile.first_name || (profile.full_name ? String(profile.full_name).split(" ")[0] : "")
                  const last = profile.last_name || (profile.full_name ? String(profile.full_name).split(" ").slice(1).join(" ") : "")
                  customer = {
                    name: `${first} ${last}`.trim() || profile.full_name || "Customer",
                    email: authedEmail,
                    phone: profile.phone ?? "",
                    address: profile.address ?? "",
                    city: profile.city ?? "",
                    zipCode: profile.zip_code ?? "",
                  }
                } else {
                  customer = { ...customer, email: authedEmail }
                }
              }
            } catch {
              // ignore and leave default
            }
          }
        } catch (err) {
          // If fetching owner profile fails, leave default customer; we still continue to build invoice
          console.warn("Failed to load owner profile for invoice", err)
        }

        // ambil items
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("id, product_id, quantity, price, products:product_id(name)")
          .eq("order_id", orderId)

        if (itemsErr) throw itemsErr

        const mapped = (items ?? []).map((it: any, idx: number) => ({
          // prefer the order_items row id (string/uuid) to ensure uniqueness even when the same product appears multiple times
          id: String(it.id ?? `idx-${idx}`),
          name: it.products?.name ?? `Product #${it.product_id}`,
          quantity: Number(it.quantity),
          unitPrice: Number(it.price),
          total: Number(it.price) * Number(it.quantity),
        }))

        const subtotal = mapped.reduce((s: number, x: any) => s + x.total, 0)
        const dbTotal = Number(order.total)

        const preferredTax = Math.round(subtotal * 0.1)
        const preferredShipping = subtotal > 0 ? 10000 : 0
        const preferredTotal = subtotal + preferredTax + preferredShipping

        let tax = preferredTax
        let shipping = preferredShipping

        if (Math.abs(dbTotal - preferredTotal) > 1) {
          const derivedShipping = Math.max(0, Math.round(dbTotal - subtotal - preferredTax))
          const totalWithDerivedShipping = subtotal + preferredTax + derivedShipping
          if (Math.abs(dbTotal - totalWithDerivedShipping) <= 1) {
            shipping = derivedShipping
          } else {
            shipping = 0
            tax = Math.max(0, Math.round(dbTotal - subtotal))
          }
        }

        const inv: InvoiceData = {
          orderNumber: String(order.order_number || order.id),
          invoiceDate: new Date(order.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          dueDate: new Date(
            new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          status: String(order.status || "paid").replace(/^./, (c: string) => c.toUpperCase()),
          customer,
          items: mapped,
          subtotal,
          tax,
          shipping,
          total: subtotal + tax + shipping,
          paymentMethod: "QRIS",
          transactionId: String(order.id),
          paymentProofUrl: order.payment_proof_url ?? null,
        }

        setInvoiceData(inv)
        setLoading(false)
      } catch (err: any) {
        console.error("invoice load error", err)
        setError(err?.message ?? String(err))
        setLoading(false)
      }
    }

    load()
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      if (!invoiceData) return

      let paymentProofBase64: string | null = null
      if (invoiceData.paymentProofUrl) {
        try {
          const response = await fetch(invoiceData.paymentProofUrl)
          const blob = await response.blob()
          paymentProofBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              let result = reader.result as string
              if (result && !result.startsWith("data:image")) {
                const base = result.split(",")[1]
                result = `data:image/png;base64,${base}`
              }
              resolve(result)
            }
            reader.readAsDataURL(blob)
          })
        } catch (err) {
          console.warn("Failed to load payment proof for PDF:", err)
        }
      }

      const dataWithBase64: InvoiceData = {
        ...invoiceData,
        paymentProofBase64,
      }

      const pdfBlob = await pdf(<InvoicePDF data={dataWithBase64} />).toBlob()
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Invoice-${invoiceData.orderNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Download failed",
        description: error?.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  // UI states
  if (loading) {
    return (
      <div className="min-h-full bg-white grid place-items-center">
        <p className="text-black font-bold">Loading invoice...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-full bg-white grid place-items-center p-6">
        <div className="max-w-xl text-center">
          <p className="text-black font-bold mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 font-bold">
            View Order History
          </Link>
        </div>
      </div>
    )
  }

  const data = invoiceData!
  const statusClass = (() => {
    const s = String(data.status || "").toLowerCase()
    if (s === "pending") return "bg-yellow-200 text-black border-2 border-black"
    if (s === "paid" || s === "shipped") return "bg-blue-300 text-black border-2 border-black"
    if (s === "delivered" || s === "completed") return "bg-green-300 text-black border-2 border-black"
    if (s === "cancelled") return "bg-red-400 text-black border-2 border-black"
    return "bg-stone-200 text-black border-2 border-black"
  })()

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body { margin: 0; padding: 0; background-color: #fff !important; }
          .no-print { display: none !important; }
          .max-w-4xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          /* Hide global layout chrome when printing the invoice */
          nav, footer, header, .navbar { display: none !important; }
          /* Target the floating WhatsApp anchor specifically */
          a[aria-label="Chat via WhatsApp"], a[aria-label="Chat via WhatsApp"] * { display: none !important; }
          /* Reduce invoice card padding on print to save vertical space */
          .invoice-card { padding: 8px !important; border-width: 0 !important; box-shadow: none !important; }
          /* Limit payment proof height on print */
          .payment-proof-img { max-height: 220px !important; object-fit: contain !important; }
        }
        /* Limit payment proof height on screen as well */
        .payment-proof-img { max-height: 260px; object-fit: contain; }
      `}</style>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 no-print flex-wrap gap-4">
          <Link
            href={backTo}
            className="flex items-center gap-2 text-black hover:underline font-black uppercase text-xs"
          >
            <ArrowLeft size={16} className="stroke-[3]" />
            {backTo === "/admin" ? "Back to Admin Panel" : "Back to Dashboard"}
          </Link>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-stone-50 text-black rounded-none transition-all font-black uppercase text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Printer size={16} className="stroke-[2.5]" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-300 border-2 border-black text-black rounded-none hover:bg-blue-400 transition-all font-black uppercase text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Download size={16} className="stroke-[2.5]" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Invoice box */}
        <div className="bg-white border-4 border-black p-8 print:p-0 print:border-none print:shadow-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none invoice-card">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-4 border-black flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-black uppercase tracking-tight">MyToko</h1>
              <p className="text-stone-600 text-xs font-black uppercase mt-1">E-Commerce Platform</p>
            </div>
            <div className="text-right sm:text-right text-left">
              <p className="text-xs text-stone-600 font-black uppercase">Invoice Number</p>
              <p className="text-2xl font-black text-black underline decoration-cyan-300 decoration-4">{data.orderNumber}</p>
              <p className="text-xs text-stone-600 font-black uppercase mt-4">Status</p>
              <span className={`inline-block px-3 py-1 text-xs font-black uppercase mt-1 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${statusClass}`}>
                {data.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-black text-black uppercase tracking-wider mb-3 border-b-2 border-black pb-1">BILL TO</p>
              <div className="space-y-1.5 wrap-break-word font-bold text-black text-sm">
                <p className="font-black text-base">{data.customer.name}</p>
                {data.customer.email && <p className="wrap-break-word text-stone-600">{data.customer.email}</p>}
                {data.customer.phone && <p className="wrap-break-word">{data.customer.phone}</p>}
                {data.customer.address && <p className="wrap-break-word">{data.customer.address}</p>}
                <p className="wrap-break-word">
                  {data.customer.city} {data.customer.zipCode}
                </p>
              </div>
            </div>
            <div className="md:text-right text-left space-y-4">
              <div>
                <p className="text-xs font-black text-black uppercase tracking-wider mb-1">Invoice Date</p>
                <p className="font-bold text-black text-sm">{data.invoiceDate}</p>
              </div>
              <div>
                <p className="text-xs font-black text-black uppercase tracking-wider mb-1">Due Date</p>
                <p className="font-bold text-black text-sm">{data.dueDate}</p>
              </div>
              <div>
                <p className="text-xs font-black text-black uppercase tracking-wider mb-1">Payment Method</p>
                <p className="font-bold text-black text-sm">{data.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8 overflow-x-auto border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b-2 border-black">
                  <th className="text-left py-3 px-4 font-black text-black uppercase text-xs">Description</th>
                  <th className="text-right py-3 px-4 font-black text-black uppercase text-xs w-24">Qty</th>
                  <th className="text-right py-3 px-4 font-black text-black uppercase text-xs w-32">Unit Price</th>
                  <th className="text-right py-3 px-4 font-black text-black uppercase text-xs w-36">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-black last:border-b-0 hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-black font-black text-sm wrap-break-word">{item.name}</td>
                    <td className="text-right py-3 px-4 text-black font-bold text-sm">{item.quantity}</td>
                    <td className="text-right py-3 px-4 text-black font-bold text-sm">
                      {formatIDR(item.unitPrice)}
                    </td>
                    <td className="text-right py-3 px-4 text-black font-black text-sm">{formatIDR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80 space-y-3">
              <div className="space-y-2 pb-3 border-b-2 border-black">
                <div className="flex justify-between text-sm font-bold text-black">
                  <span className="uppercase text-xs tracking-wider text-stone-600">Subtotal</span>
                  <span>{formatIDR(data.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-black">
                  <span className="uppercase text-xs tracking-wider text-stone-600">Tax</span>
                  <span>{formatIDR(data.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-black">
                  <span className="uppercase text-xs tracking-wider text-stone-600">Shipping</span>
                  <span>{formatIDR(data.shipping)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center font-bold text-black">
                <span className="uppercase text-xs tracking-widest font-black">Total</span>
                <span className="text-xl font-black text-black bg-yellow-200 border-2 border-black px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {formatIDR(data.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-stone-100 p-6 border-2 border-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <p className="text-xs font-black text-black mb-3 uppercase tracking-wider">PAYMENT INFORMATION</p>
            <div className="space-y-2 text-sm font-bold text-black">
              <p>
                <span className="text-stone-600 uppercase text-xs mr-2">Transaction ID:</span>{" "}
                <span className="underline">{data.transactionId}</span>
              </p>
              <p>
                <span className="text-stone-600 uppercase text-xs mr-2">Payment Method:</span>{" "}
                <span>{data.paymentMethod}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-stone-600 uppercase text-xs">Payment Status:</span>{" "}
                <span className={`px-2 py-0.5 text-xs font-black uppercase rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${statusClass}`}>
                  {data.status}
                </span>
              </p>
            </div>
          </div>

          {/* Payment Proof */}
          {data.paymentProofUrl && (
            <div className="bg-white p-6 border-2 border-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <p className="text-xs font-black text-black mb-4 uppercase tracking-wider">PAYMENT PROOF</p>
              <div className="flex justify-center border-2 border-black p-4 bg-stone-50">
                <img
                  src={data.paymentProofUrl}
                  alt="Payment Proof"
                  className="max-w-md w-full h-auto rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-64 object-contain payment-proof-img"
                />
              </div>
              <p className="text-xs text-center text-stone-600 mt-4 font-black uppercase">
                Receipt uploaded on {data.invoiceDate}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-4 border-black pt-8 text-center text-sm text-black space-y-2">
            <p className="font-black uppercase text-base tracking-wider">Thank you for your business!</p>
            <p className="font-bold text-stone-600">
              For support, contact us at <span className="underline text-black font-black">faiznaufal2015@gmail.com</span> or call <span className="text-black font-black">+62 877-8712-8257</span>
            </p>
            <p className="pt-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
              This is an official invoice from MyToko. Please keep this for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== PDF stuff (boleh tetap di sini) =====

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: 2,
    borderBottomColor: "#e5e7eb",
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563eb",
  },
  subtitle: {
    fontSize: 10,
    color: "#374151",
    marginTop: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 3,
  },
  invoiceNumberValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  status: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: 6,
    borderRadius: 12,
    fontSize: 10,
    marginTop: 10,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "bold",
  },
  text: {
    fontSize: 10,
    color: "#111827",
    marginBottom: 4,
  },
  boldText: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "bold",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
  },
  tableCol1: {
    flex: 2,
  },
  tableCol2: {
    flex: 1,
    textAlign: "right",
  },
  tableCol3: {
    flex: 1,
    textAlign: "right",
  },
  tableCol4: {
    flex: 1,
    textAlign: "right",
  },
  totals: {
    marginTop: 12,
    marginLeft: "auto",
    width: "50%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: "#374151",
  },
  totalValue: {
    fontSize: 10,
    color: "#111827",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTop: 2,
    borderTopColor: "#e5e7eb",
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  paymentInfo: {
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: 2,
    borderTopColor: "#e5e7eb",
    textAlign: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 4,
  },
})

function InvoicePDF({ data }: { data: InvoiceData }) {
  const getStatusStyle = (status: string) => {
    const s = String(status || "").toLowerCase()
    if (s === "pending") return { backgroundColor: "#fef3c7", color: "#92400e" }
    if (s === "paid" || s === "shipped") return { backgroundColor: "#dbeafe", color: "#1e40af" }
    if (s === "delivered" || s === "completed") return { backgroundColor: "#d1fae5", color: "#065f46" }
    if (s === "cancelled") return { backgroundColor: "#fee2e2", color: "#991b1b" }
    return { backgroundColor: "#f3f4f6", color: "#1f2937" }
  }

  const statusStyle = getStatusStyle(data.status)

  return (
    <Document>
      <PDFPage size="A4" style={styles.page}>
        {/* header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MyToko</Text>
            <Text style={styles.subtitle}>E-Commerce Platform</Text>
          </View>
          <View>
            <Text style={styles.invoiceNumber}>Invoice Number</Text>
            <Text style={styles.invoiceNumberValue}>{data.orderNumber}</Text>
            <Text style={[styles.status, statusStyle]}>{data.status}</Text>
          </View>
        </View>

        {/* bill to */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={styles.boldText}>{data.customer.name}</Text>
            <Text style={styles.text}>{data.customer.email}</Text>
            <Text style={styles.text}>{data.customer.phone}</Text>
            <Text style={styles.text}>{data.customer.address}</Text>
            <Text style={styles.text}>
              {data.customer.city}, {data.customer.zipCode}
            </Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Invoice Date</Text>
            <Text style={styles.boldText}>{data.invoiceDate}</Text>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Due Date</Text>
            <Text style={styles.boldText}>{data.dueDate}</Text>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Payment Method</Text>
            <Text style={styles.boldText}>{data.paymentMethod}</Text>
          </View>
        </View>

        {/* items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.boldText, styles.tableCol1]}>Description</Text>
            <Text style={[styles.boldText, styles.tableCol2]}>Quantity</Text>
            <Text style={[styles.boldText, styles.tableCol3]}>Unit Price</Text>
            <Text style={[styles.boldText, styles.tableCol4]}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.text, styles.tableCol1]}>{item.name}</Text>
              <Text style={[styles.text, styles.tableCol2]}>{item.quantity}</Text>
              <Text style={[styles.text, styles.tableCol3]}>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.unitPrice)}
              </Text>
              <Text style={[styles.text, styles.tableCol4]}>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (10%)</Text>
            <Text style={styles.totalValue}>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.tax)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalValue}>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.shipping)}
            </Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(data.total)}
            </Text>
          </View>
        </View>

        {/* payment info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
          <Text style={styles.text}>Transaction ID: {data.transactionId}</Text>
          <Text style={styles.text}>Payment Method: {data.paymentMethod}</Text>
          <Text style={styles.text}>Payment Status: {data.status}</Text>
          {data.paymentProofBase64 ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionTitle}>PAYMENT PROOF</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={data.paymentProofBase64}
                    style={{ width: "100%", maxHeight: 140, objectFit: "contain", marginTop: 8 }}
                  />
            </View>
          ) : null}
        </View>

        {/* footer */}
        <View style={styles.footer}>
          <Text style={styles.boldText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            For support, contact us at faiznaufal2015@gmail.com or call +62 877-8712-8257
          </Text>
          <Text style={[styles.footerText, { fontSize: 8, marginTop: 10 }]}>
            This is an official invoice from MyToko. Please keep this for your records.
          </Text>
        </View>
      </PDFPage>
    </Document>
  )
}
