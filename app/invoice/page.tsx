"use client"

import { useEffect, useState } from "react"
import { Download, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser"
import { formatIDR } from "@/lib/utils"

export default function InvoicePage() {
  const [orderId, setOrderId] = useState<string | null>(null)
  const [parsed, setParsed] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<any | null>(null)

  useEffect(() => {
    // Avoid useSearchParams to prevent Suspense requirement in App Router
    try {
      const url = new URL(window.location.href)
      const id = url.searchParams.get("orderId")
      setOrderId(id)
      setParsed(true)
    } catch (_) {
      setOrderId(null)
      setParsed(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      // Wait until URL query parsing is completed to avoid a race
      if (!parsed) return
      // reset state for a fresh attempt when orderId changes
      setError(null)
      setLoading(true)
      if (!orderId) {
        // Fallback: try the most recent order for the logged-in user
        try {
          const { data: authData } = await supabaseBrowser.auth.getUser()
          const uid = authData.user?.id
          if (!uid) throw new Error("Unauthorized")
          const { data: recent, error: recentErr } = await supabaseBrowser
            .from("orders")
            .select("id, order_number, total, created_at, status")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!recent || recentErr) {
            setError("Order ID not found. Open the invoice from Checkout or your Order History.")
            setLoading(false)
            return
          }
          setOrderId(recent.id as string)
          return
        } catch (_e) {
          setError("Order ID not found. Open the invoice from Checkout or your Order History.")
          setLoading(false)
          return
        }
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }
      try {
        // First try admin endpoint (if current user is admin, it will succeed)
        try {
          const resp = await fetch(`/api/admin/orders/${orderId}`, { cache: 'no-store' })
          if (resp.ok) {
            const j = await resp.json()
            const ord = j.order
            const items = (j.items || []).map((it: any) => ({
              id: Number(it.product_id),
              name: it.products?.name ?? `Product #${it.product_id}`,
              quantity: Number(it.quantity),
              unitPrice: Number(it.price),
              total: Number(it.price) * Number(it.quantity),
            }))
            const subtotal = items.reduce((s: number, x: any) => s + x.total, 0)
            const preferredTax = Math.round(subtotal * 0.10)
            const preferredShipping = subtotal > 0 ? 10000 : 0
            const inv = {
              orderNumber: String(ord.order_number || ord.id),
              invoiceDate: new Date(ord.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
              dueDate: new Date(new Date(ord.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
              status: String(ord.status || "paid").replace(/^./, (c) => c.toUpperCase()),
              customer: {
                name: (j.customer?.full_name || `${j.customer?.first_name ?? ''} ${j.customer?.last_name ?? ''}`.trim() || 'Customer'),
                email: j.customer?.email ?? '',
                phone: j.customer?.phone ?? '',
                address: j.customer?.address ?? '',
                city: j.customer?.city ?? '',
                zipCode: j.customer?.zip_code ?? '',
              },
              items,
              subtotal,
              tax: preferredTax,
              shipping: preferredShipping,
              total: subtotal + preferredTax + preferredShipping,
              paymentMethod: 'QRIS',
              transactionId: String(ord.id),
            }
            setInvoiceData(inv)
            setLoading(false)
            return
          }
        } catch {}

        const { data: order, error: orderErr } = await supabaseBrowser
          .from("orders")
          .select("id, order_number, total, created_at, status")
          .eq("id", orderId)
          .maybeSingle()

        if (orderErr) throw orderErr
        if (!order) {
          // Try fallback to most recent order of this user
          const { data: authData } = await supabaseBrowser.auth.getUser()
          const uid = authData.user?.id
          if (uid) {
            const { data: recent } = await supabaseBrowser
              .from("orders")
              .select("id, order_number, total, created_at, status")
              .eq("user_id", uid)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (recent) {
              setOrderId(recent.id as string)
              return
            }
          }
          setError("Order not found or you are not authorized to access it.")
          setLoading(false)
          return
        }

        // Load customer profile for BILL TO
        let customer = { name: "Customer", email: "", phone: "", address: "", city: "", zipCode: "" }
        try {
          const { data: authData } = await supabaseBrowser.auth.getUser()
          const uid = authData.user?.id
          if (uid) {
            const { data: profile } = await supabaseBrowser
              .from("profiles")
              .select("first_name, last_name, full_name, phone, address, city, zip_code")
              .eq("id", uid)
              .maybeSingle()
            if (profile) {
              const first = profile.first_name || (profile.full_name ? String(profile.full_name).split(" ")[0] : "")
              const last = profile.last_name || (profile.full_name ? String(profile.full_name).split(" ").slice(1).join(" ") : "")
              customer = {
                name: `${first} ${last}`.trim() || "Customer",
                email: authData.user?.email ?? "",
                phone: profile.phone ?? "",
                address: profile.address ?? "",
                city: profile.city ?? "",
                zipCode: profile.zip_code ?? "",
              }
            }
          }
        } catch {}

        const { data: items, error: itemsErr } = await supabaseBrowser
          .from("order_items")
          .select("product_id, quantity, price, products:product_id(name)")
          .eq("order_id", orderId)

        if (itemsErr) throw itemsErr

        const mapped = (items ?? []).map((it: any) => ({
          id: Number(it.product_id),
          name: it.products?.name ?? `Product #${it.product_id}`,
          quantity: Number(it.quantity),
          unitPrice: Number(it.price),
          total: Number(it.price) * Number(it.quantity),
        }))

        const subtotal = mapped.reduce((s: number, x: any) => s + x.total, 0)
        const dbTotal = Number(order.total)
  // Preferred breakdown (matches current RPC): tax=10% of subtotal, shipping=Rp 10.000
  const preferredTax = Math.round(subtotal * 0.10)
  const preferredShipping = subtotal > 0 ? 10000 : 0
  const preferredTotal = subtotal + preferredTax + preferredShipping

        let tax = preferredTax
        let shipping = preferredShipping

        if (Math.abs(dbTotal - preferredTotal) > 1) {
          // First fallback for older orders: keep 10% tax, derive shipping from DB total
          const derivedShipping = Math.max(0, Math.round(dbTotal - subtotal - preferredTax))
          const totalWithDerivedShipping = subtotal + preferredTax + derivedShipping
          if (Math.abs(dbTotal - totalWithDerivedShipping) <= 1) {
            shipping = derivedShipping
          } else {
            // Second fallback (older orders): push difference into tax and set shipping 0
            shipping = 0
            tax = Math.max(0, Math.round(dbTotal - subtotal))
          }
        }

        const inv = {
          orderNumber: String((order as any).order_number || order.id),
          invoiceDate: new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
          dueDate: new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
          status: String(order.status || "paid").replace(/^./, (c) => c.toUpperCase()),
          customer,
          items: mapped,
          subtotal,
          tax,
          shipping,
          total: subtotal + tax + shipping,
          paymentMethod: "QRIS",
          transactionId: String(order.id),
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
  }, [orderId, parsed])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      if (!invoiceData) return
      const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice-${invoiceData.orderNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <p className="text-black font-bold">Loading invoice...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white grid place-items-center p-6">
        <div className="max-w-xl text-center">
          <p className="text-black font-bold mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-600 font-bold">View Order History</Link>
        </div>
      </div>
    )
  }

  const data = invoiceData!
  const statusClass = (() => {
    const s = String(data.status || "").toLowerCase()
    if (s === "pending") return "bg-yellow-100 text-yellow-800"
    if (s === "paid" || s === "shipped") return "bg-blue-100 text-blue-800"
    if (s === "delivered" || s === "completed") return "bg-green-100 text-green-800"
    if (s === "cancelled") return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  })()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold">
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-bold text-black"
            >
              <Printer size={20} />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
            >
              <Download size={20} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Invoice */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 print:border-0 print:shadow-none shadow-lg">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-gray-300">
            <div>
              <h1 className="text-4xl font-bold text-blue-600">MyToko</h1>
              <p className="text-black text-sm mt-2 font-bold">E-Commerce Platform</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-black font-bold">Invoice Number</p>
              <p className="text-xl font-bold text-black">{data.orderNumber}</p>
              <p className="text-sm text-black font-bold mt-4">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-1 ${statusClass}`}>
                {data.status}
              </span>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm text-black font-bold mb-2">BILL TO</p>
              <div className="space-y-1">
                <p className="font-bold text-black">{data.customer.name}</p>
                <p className="text-sm text-black font-bold">{data.customer.email}</p>
                <p className="text-sm text-black font-bold">{data.customer.phone}</p>
                <p className="text-sm text-black font-bold">{data.customer.address}</p>
                <p className="text-sm text-black font-bold">{data.customer.city} {data.customer.zipCode}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-black font-bold">Invoice Date</p>
                  <p className="font-bold text-black">{data.invoiceDate}</p>
                </div>
                <div>
                  <p className="text-sm text-black font-bold">Due Date</p>
                  <p className="font-bold text-black">{data.dueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-black font-bold">Payment Method</p>
                  <p className="font-bold text-black">{data.paymentMethod}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-black">Description</th>
                  <th className="text-right py-3 px-4 font-bold text-black">Quantity</th>
                  <th className="text-right py-3 px-4 font-bold text-black">Unit Price</th>
                  <th className="text-right py-3 px-4 font-bold text-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-3 px-4 text-black font-bold">{item.name}</td>
                    <td className="text-right py-3 px-4 text-black font-bold">{item.quantity}</td>
                    <td className="text-right py-3 px-4 text-black font-bold">{formatIDR(item.unitPrice)}</td>
                    <td className="text-right py-3 px-4 text-black font-bold">{formatIDR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80">
              <div className="space-y-2 mb-4 pb-4 border-b-2 border-gray-300">
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Subtotal</span>
                  <span className="text-black font-bold">{formatIDR(data.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Tax</span>
                  <span className="text-black font-bold">{formatIDR(data.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Shipping</span>
                  <span className="text-black font-bold">{formatIDR(data.shipping)}</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-black">
                <span>Total</span>
                <span className="text-blue-600">{formatIDR(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-100 p-6 rounded-lg mb-8 border-2 border-gray-300">
            <p className="text-sm text-black font-bold mb-2">PAYMENT INFORMATION</p>
            <div className="space-y-1">
              <p className="text-sm text-black">
                <span className="font-bold">Transaction ID:</span>{" "}
                <span className="font-bold">{data.transactionId}</span>
              </p>
              <p className="text-sm text-black">
                <span className="font-bold">Payment Method:</span>{" "}
                <span className="font-bold">{data.paymentMethod}</span>
              </p>
              <p className="text-sm text-black">
                <span className="font-bold">Payment Status:</span>{" "}
                <span className={`font-bold px-2 py-0.5 rounded-full ${statusClass}`}>{data.status}</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-6 text-center text-sm text-black">
            <p className="font-bold">Thank you for your business!</p>
            <p className="mt-2 font-bold">For support, contact us at faiznaufal2015@gmail.com or call +62 877-8712-8257</p>
            <p className="mt-4 text-xs text-black font-bold">
              This is an official invoice from MyToko. Please keep this for your records.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:border-0 {
            border: none;
          }
          .print\\:shadow-none {
            box-shadow: none;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

// PDF Document Component
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 10,
    color: '#374151',
    marginTop: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
  },
  invoiceNumberValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  status: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: 6,
    borderRadius: 12,
    fontSize: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 10,
    color: '#111827',
    marginBottom: 4,
  },
  boldText: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tableCol1: {
    flex: 2,
  },
  tableCol2: {
    flex: 1,
    textAlign: 'right',
  },
  tableCol3: {
    flex: 1,
    textAlign: 'right',
  },
  tableCol4: {
    flex: 1,
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    color: '#111827',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: 2,
    borderTopColor: '#e5e7eb',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  paymentInfo: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: 2,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 4,
  },
})

interface InvoicePDFProps {
  data: typeof InvoicePage extends () => any ? any : never
}

function InvoicePDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MyToko</Text>
            <Text style={styles.subtitle}>E-Commerce Platform</Text>
          </View>
          <View>
            <Text style={styles.invoiceNumber}>Invoice Number</Text>
            <Text style={styles.invoiceNumberValue}>{data.orderNumber}</Text>
            <Text style={styles.status}>{data.status}</Text>
          </View>
        </View>

        {/* Customer and Invoice Details */}
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

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.boldText, styles.tableCol1]}>Description</Text>
            <Text style={[styles.boldText, styles.tableCol2]}>Quantity</Text>
            <Text style={[styles.boldText, styles.tableCol3]}>Unit Price</Text>
            <Text style={[styles.boldText, styles.tableCol4]}>Total</Text>
          </View>
          {data.items.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.text, styles.tableCol1]}>{item.name}</Text>
              <Text style={[styles.text, styles.tableCol2]}>{item.quantity}</Text>
              <Text style={[styles.text, styles.tableCol3]}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.unitPrice)}</Text>
              <Text style={[styles.text, styles.tableCol4]}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (10%)</Text>
            <Text style={styles.totalValue}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalValue}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.shipping)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.total)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentInfo}>
          <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
          <Text style={styles.text}>Transaction ID: {data.transactionId}</Text>
          <Text style={styles.text}>Payment Method: {data.paymentMethod}</Text>
          <Text style={styles.text}>Payment Status: {data.status}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.boldText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            For support, contact us at faiznaufal2015@gmail.com or call +62 877-8712-8257
          </Text>
          <Text style={[styles.footerText, { fontSize: 8, marginTop: 10 }]}>
            This is an official invoice from MyToko. Please keep this for your records.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
