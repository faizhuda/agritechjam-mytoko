"use client"

import { useEffect, useState } from "react"
import { Download, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser"

export default function InvoicePage() {
  const [orderId, setOrderId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<any | null>(null)

  useEffect(() => {
    // Avoid useSearchParams to prevent Suspense requirement in App Router
    try {
      const url = new URL(window.location.href)
      const id = url.searchParams.get("orderId")
      setOrderId(id)
    } catch (_) {
      setOrderId(null)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!orderId) {
        // Fallback: try the most recent order for the logged-in user
        try {
          const { data: authData } = await supabaseBrowser.auth.getUser()
          const uid = authData.user?.id
          if (!uid) throw new Error("Unauthorized")
          const { data: recent, error: recentErr } = await supabaseBrowser
            .from("orders")
            .select("id, total, created_at, status")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!recent || recentErr) {
            setError("Order ID tidak ditemukan. Buka invoice dari halaman Checkout atau riwayat pesanan.")
            setLoading(false)
            return
          }
          setOrderId(recent.id as string)
          return
        } catch (_e) {
          setError("Order ID tidak ditemukan. Buka invoice dari halaman Checkout atau riwayat pesanan.")
          setLoading(false)
          return
        }
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase belum dikonfigurasi.")
        setLoading(false)
        return
      }
      try {
        const { data: order, error: orderErr } = await supabaseBrowser
          .from("orders")
          .select("id, total, created_at, status")
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
              .select("id, total, created_at, status")
              .eq("user_id", uid)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (recent) {
              setOrderId(recent.id as string)
              return
            }
          }
          setError("Order tidak ditemukan atau Anda tidak berhak mengaksesnya.")
          setLoading(false)
          return
        }

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
        // Preferred breakdown (matches current RPC): tax=10% of subtotal, shipping=10
        const preferredTax = Math.round(subtotal * 0.10 * 100) / 100
        const preferredShipping = 10
        const preferredTotal = Math.round((subtotal + preferredTax + preferredShipping) * 100) / 100

        let tax = preferredTax
        let shipping = preferredShipping

        if (Math.abs(dbTotal - preferredTotal) > 0.01) {
          // First fallback: keep 10% tax, derive shipping from DB total
          const derivedShipping = Math.max(0, Math.round(((dbTotal - subtotal - preferredTax) * 100)) / 100)
          const totalWithDerivedShipping = Math.round((subtotal + preferredTax + derivedShipping) * 100) / 100
          if (Math.abs(dbTotal - totalWithDerivedShipping) <= 0.01) {
            shipping = derivedShipping
          } else {
            // Second fallback (older orders): push difference into tax and set shipping 0
            shipping = 0
            tax = Math.max(0, Math.round(((dbTotal - subtotal) * 100)) / 100)
          }
        }

        const inv = {
          orderNumber: String(order.id),
          invoiceDate: new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
          dueDate: new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
          status: String(order.status || "paid").replace(/^./, (c) => c.toUpperCase()),
          customer: {
            name: "Customer",
            email: "",
            phone: "",
            address: "",
            city: "",
            zipCode: "",
          },
          items: mapped,
          subtotal,
          tax,
          shipping,
          total: dbTotal,
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
  }, [orderId])

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
          <Link href="/purchase-history" className="text-blue-600 font-bold">Lihat Riwayat Pesanan</Link>
        </div>
      </div>
    )
  }

  const data = invoiceData!

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
              <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold mt-1">
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
                    <td className="text-right py-3 px-4 text-black font-bold">${item.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 text-black font-bold">${item.total.toFixed(2)}</td>
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
                  <span className="text-black font-bold">${data.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Tax</span>
                  <span className="text-black font-bold">${data.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Shipping</span>
                  <span className="text-black font-bold">${data.shipping.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-black">
                <span>Total</span>
                <span className="text-blue-600">${data.total.toFixed(2)}</span>
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
                <span className="font-bold text-blue-600">{data.status}</span>
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
              <Text style={[styles.text, styles.tableCol3]}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.text, styles.tableCol4]}>${item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${data.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (10%)</Text>
            <Text style={styles.totalValue}>${data.tax.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shipping</Text>
            <Text style={styles.totalValue}>${data.shipping.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>${data.total.toFixed(2)}</Text>
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
