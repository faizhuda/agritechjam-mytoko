"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer'
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser"
import { useToast } from "@/hooks/use-toast"
import { formatIDR } from "@/lib/utils"

export default function InvoiceClient() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const from = searchParams.get("from")
  const backTo = from === "admin" ? "/admin" : "/dashboard"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<any | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      setError(null)
      setLoading(true)
      if (!orderId) {
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
      // ...existing code...
    }
    load()
  }, [orderId])

  // ...existing UI code...
  return (
    <div>
      {/* Invoice UI here */}
      {/* ...existing code... */}
    </div>
  )
}
