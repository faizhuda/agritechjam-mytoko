"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Users, ShoppingCart, DollarSign, TrendingUp, Edit2, Trash2, Plus, Star } from "lucide-react"
import { formatIDR } from "@/lib/utils"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import type { Product } from "@/lib/product-data"
import { useConfirm } from "@/hooks/use-confirm"
import { useToast } from "@/hooks/use-toast"

type OrderRow = {
  id: string
  user_id: string
  total: number
  status: string
  created_at: string
}

type TxnRow = {
  id: string
  customer: string
  amount: number
  status: string
  date: string
}

const statusClass = (status: string) => {
  const s = status.toLowerCase()
  if (s === "completed" || s === "delivered") return "bg-green-100 text-green-800"
  if (s === "pending") return "bg-yellow-100 text-yellow-800"
  if (s === "paid" || s === "shipped") return "bg-blue-100 text-blue-800"
  if (s === "cancelled") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s

export default function AdminDashboard() {
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [kpi, setKpi] = useState({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, growthRate: 0 })
  const [salesData, setSalesData] = useState<{ month: string; sales: number; orders: number }[]>([])
  const [recent, setRecent] = useState<TxnRow[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [showAllOrders, setShowAllOrders] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)
  
  // Filters and sorting for orders
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [orderSortBy, setOrderSortBy] = useState<'date' | 'amount'>('date')
  const [orderSortOrder, setOrderSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Filters and sorting for products
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all')
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all')
  const [productSortBy, setProductSortBy] = useState<'name' | 'price' | 'stock' | 'rating'>('name')
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "electronics",
    stock: "",
    description: "",
    features: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; description: string; features: string; category: string; stock: string }>({ name: "", description: "", features: "", category: "electronics", stock: "" })
  const [editImage, setEditImage] = useState<File | null>(null)

  const { confirm, ConfirmDialog } = useConfirm()
  const { toast } = useToast()

  // Gate: only admins allowed
  useEffect(() => {
    const check = async () => {
      if (!isSupabaseConfigured()) {
        setAuthLoading(false)
        setIsAdmin(false)
        return
      }
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) {
        setAuthLoading(false)
        setIsAdmin(false)
        return
      }
      const { data: profile } = await supabase.from("profiles").select("is_admin, full_name").eq("id", uid).maybeSingle()
      setIsAdmin(Boolean(profile?.is_admin))
      setAuthLoading(false)
    }
    check()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured() || !isAdmin) return

      // Load orders via server API (uses service role when available)
      const resp = await fetch('/api/admin/orders', { cache: 'no-store' })
      const j = await resp.json().catch(() => ({}))
      const apiOrders = Array.isArray(j?.orders) ? j.orders : []

      const orderRows: OrderRow[] = (apiOrders || []).map((o: any) => ({
        id: String(o.id),
        user_id: String(o.user_id),
        total: Number(o.total ?? 0),
        status: String(o.status ?? "pending"),
        created_at: o.created_at,
      }))

  // KPI: include only paid/shipped/delivered
  const includedStatuses = new Set(['paid','shipped','delivered'])
  const included = orderRows.filter((o) => includedStatuses.has(String(o.status).toLowerCase()))
  const totalRevenue = included.reduce((s, o) => s + (o.total || 0), 0)
  const totalOrders = included.length
  const totalCustomers = new Set(included.map((o) => o.user_id)).size
      const now = new Date()
      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const prevStart30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const last30 = included.filter((o) => new Date(o.created_at) >= start30)
  const prev30 = included.filter((o) => new Date(o.created_at) < start30 && new Date(o.created_at) >= prevStart30)
      const lastSum = last30.reduce((s, x) => s + x.total, 0)
      const prevSum = prev30.reduce((s, x) => s + x.total, 0)
      const growthRate = prevSum > 0 ? ((lastSum - prevSum) / prevSum) * 100 : (lastSum > 0 ? 100 : 0)
      setKpi({ totalRevenue, totalOrders, totalCustomers, growthRate })

      // Charts: aggregate by month for last 6 months
      const byMonth = new Map<string, { sales: number; orders: number }>()
      const months = [...Array(6)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return d
      })
      for (const d of months) {
        const key = d.toLocaleString(undefined, { month: "short" })
        byMonth.set(key, { sales: 0, orders: 0 })
      }
      for (const o of included) {
        const d = new Date(o.created_at)
        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
        if (diffMonths >= 0 && diffMonths < 6) {
          const key = d.toLocaleString(undefined, { month: "short" })
          const cur = byMonth.get(key) || { sales: 0, orders: 0 }
          cur.sales += o.total || 0
          cur.orders += 1
          byMonth.set(key, cur)
        }
      }
      const monthly = Array.from(byMonth.entries()).map(([month, v]) => ({ month, ...v }))
      setSalesData(monthly)

      // All transactions; customer names provided by API
      const txns: TxnRow[] = (apiOrders as any[]).map((o: any) => ({
        id: String(o.id),
        customer: String(o.customer || "Customer"),
        amount: o.total || 0,
        status: capitalize(String(o.status || "pending")),
        date: new Date(String(o.created_at)).toISOString().slice(0, 10),
      }))
      setRecent(txns)

      // Products
      const { data: prod } = await supabase
        .from("products")
        .select(
          "id, name, price, original_price, category, rating, reviews, image, description, long_description, features, stock, in_stock"
        )
        .eq('archived', false)
        .order("id", { ascending: true })
      const mapped: Product[] = (prod || []).map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        price: Number(p.price),
        originalPrice: p.original_price != null ? Number(p.original_price) : undefined,
        category: p.category,
        rating: Number(p.rating ?? 0),
        reviews: Number(p.reviews ?? 0),
        image: p.image ?? "",
        description: p.description ?? "",
        longDescription: p.long_description ?? "",
        features: Array.isArray(p.features) ? p.features : [],
        stock: Number(p.stock ?? 0),
        inStock: Boolean(p.in_stock ?? (p.stock ?? 0) > 0),
      }))
      setProducts(mapped)
    }
    load()
  }, [isAdmin])

  // Derive live review stats for displayed products to ensure rating is consistent with reviews in DB
  const [reviewStats, setReviewStats] = useState<Record<number, { count: number; average: number }>>({})
  useEffect(() => {
    const run = async () => {
      try {
        const ids = products.map((p) => p.id)
        if (!ids.length) return
        const { fetchReviewStatsForProductIds } = await import("@/lib/db/products")
        const stats = await fetchReviewStatsForProductIds(ids)
        setReviewStats(stats)
      } catch (_) {}
    }
    run()
  }, [products])

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = [...recent]
    
    // Filter by status
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(o => o.status.toLowerCase() === orderStatusFilter)
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (orderSortBy === 'date') {
        const comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        return orderSortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = a.amount - b.amount
        return orderSortOrder === 'asc' ? comparison : -comparison
      }
    })
    
    return filtered
  }, [recent, orderStatusFilter, orderSortBy, orderSortOrder])

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]
    
    // Filter by category
    if (productCategoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === productCategoryFilter)
    }
    
    // Filter by stock status
    if (productStockFilter === 'in-stock') {
      filtered = filtered.filter(p => p.stock > 10)
    } else if (productStockFilter === 'low-stock') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10)
    } else if (productStockFilter === 'out-of-stock') {
      filtered = filtered.filter(p => p.stock === 0)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (productSortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (productSortBy === 'price') {
        comparison = a.price - b.price
      } else if (productSortBy === 'stock') {
        comparison = a.stock - b.stock
      } else if (productSortBy === 'rating') {
        const ratingA = reviewStats[a.id]?.average ?? a.rating
        const ratingB = reviewStats[b.id]?.average ?? b.rating
        comparison = ratingA - ratingB
      }
      return productSortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [products, productCategoryFilter, productStockFilter, productSortBy, productSortOrder, reviewStats])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured() || !isAdmin) return
    const price = Number(newProduct.price)
    const stock = Number(newProduct.stock || 0)
    const description = newProduct.description?.trim() || ""
    const featuresArray = (newProduct.features || "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    let imageUrl: string | undefined = undefined
    try {
      if (imageFile) {
        const filePath = `products/${Date.now()}_${imageFile.name}`
        const { error: upErr } = await supabase.storage.from('products').upload(filePath, imageFile)
        if (!upErr) {
          const { data: pub } = await supabase.storage.from('products').getPublicUrl(filePath)
          imageUrl = pub?.publicUrl
        }
      }
    } catch (_) {
      // ignore upload problems and continue without image
    }

    const payload: any = {
      name: newProduct.name,
      price,
      category: newProduct.category,
      stock,
      rating: 0,
      reviews: 0,
      image: imageUrl || "",
      description,
      long_description: description,
      features: featuresArray,
    }
    const { error, data } = await supabase.from("products").insert(payload).select("*").single()
    if (!error && data) {
      setProducts((prev) => [
        ...prev,
        {
          id: Number(data.id),
          name: data.name,
          price: Number(data.price),
          originalPrice: data.original_price != null ? Number(data.original_price) : undefined,
          category: data.category,
          rating: Number(data.rating ?? 0),
          reviews: Number(data.reviews ?? 0),
          image: data.image ?? "",
          description: data.description ?? "",
          longDescription: data.long_description ?? "",
          features: Array.isArray(data.features) ? data.features : [],
          stock: Number(data.stock ?? 0),
          inStock: Number(data.stock ?? 0) > 0,
        },
      ])
      toast({ title: "Product added", description: `${data.name} has been added.` })
    } else if (error) {
      toast({ title: "Add product failed", description: error.message, variant: "destructive" })
      return
    }
    setShowAddProduct(false)
    setImageFile(null)
    setNewProduct({ name: "", price: "", category: "electronics", stock: "", description: "", features: "" })
  }

  // Deprecated: stock editing handled by modal below
  // const handleEditProduct = async (p: Product) => { /* removed */ }

  const handleDeleteProduct = async (p: Product) => {
    if (!isSupabaseConfigured() || !isAdmin) return
    const ok = await confirm({
      title: `Archive "${p.name}"?`,
      description: "This will hide the product from the store (soft delete). You can restore it later in the database.",
      confirmText: "Archive",
      cancelText: "Cancel",
      variant: "destructive",
    })
    if (!ok) return
    // Soft-delete to avoid FK violations on order_items
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", p.id)
    if (!error) {
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      toast({ title: "Product archived", description: `${p.name} has been archived.` })
    } else {
      // Fallback message for missing column or other issues
      toast({ title: "Archive failed", description: (error as any)?.message || 'Failed to archive product. Ensure products_soft_delete.sql is applied.', variant: "destructive" })
    }
  }

  const handleChangeStatus = async (orderId: string, next: string) => {
    try {
      // If changing to cancelled, use the RPC to restore stock
      if (next.toLowerCase() === 'cancelled') {
        if (!isSupabaseConfigured()) {
          toast({ title: "Configuration error", description: "Supabase is not configured", variant: "destructive" })
          return
        }
        
        const { error } = await supabase.rpc('cancel_order_and_restore_stock', {
          p_order_id: orderId,
        })
        
        if (error) {
          const msg = error.message || 'Failed to cancel order'
          // User-friendly error messages
          if (msg.includes('pending or paid')) {
            toast({ 
              title: 'Cannot cancel', 
              description: 'Only pending or paid orders can be cancelled. Shipped/delivered orders should use return flow.', 
              variant: 'destructive' 
            })
          } else if (msg.includes('already cancelled')) {
            toast({ title: 'Already cancelled', description: 'This order is already cancelled.', variant: 'destructive' })
          } else {
            toast({ title: 'Cancel failed', description: msg, variant: 'destructive' })
          }
          return
        }
        
        setRecent((prev) => prev.map((t) => (t.id === orderId ? { ...t, status: 'Cancelled' } : t)))
        toast({ title: 'Order cancelled', description: 'Stock has been restored.' })
      } else {
        // For other status changes, use the regular API
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: orderId, status: next.toLowerCase() }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || `Failed to set status: ${res.status}`)
        }
        setRecent((prev) => prev.map((t) => (t.id === orderId ? { ...t, status: next } : t)))
        toast({ title: 'Status updated', description: `Order status changed to ${next}.` })
      }

      // Refresh KPIs and charts after status changes (e.g., cancelled should reduce totals)
      try {
        const resp = await fetch('/api/admin/orders', { cache: 'no-store' })
        const j = await resp.json().catch(() => ({}))
        const apiOrders = Array.isArray(j?.orders) ? j.orders : []
        const orderRows: OrderRow[] = (apiOrders || []).map((o: any) => ({
          id: String(o.id),
          user_id: String(o.user_id),
          total: Number(o.total ?? 0),
          status: String(o.status ?? 'pending'),
          created_at: o.created_at,
        }))
        const includedStatuses = new Set(['paid','shipped','delivered'])
        const included = orderRows.filter((o) => includedStatuses.has(String(o.status).toLowerCase()))
        const totalRevenue = included.reduce((s, o) => s + (o.total || 0), 0)
        const totalOrders = included.length
        const totalCustomers = new Set(included.map((o) => o.user_id)).size
        setKpi((prev) => ({ ...prev, totalRevenue, totalOrders, totalCustomers }))

        // Update charts
        const now = new Date()
        const byMonth = new Map<string, { sales: number; orders: number }>()
        const months = [...Array(6)].map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          return d
        })
        for (const d of months) {
          const key = d.toLocaleString(undefined, { month: 'short' })
          byMonth.set(key, { sales: 0, orders: 0 })
        }
        for (const o of included) {
          const d = new Date(o.created_at)
          const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
          if (diffMonths >= 0 && diffMonths < 6) {
            const key = d.toLocaleString(undefined, { month: 'short' })
            const cur = byMonth.get(key) || { sales: 0, orders: 0 }
            cur.sales += o.total || 0
            cur.orders += 1
            byMonth.set(key, cur)
          }
        }
        const monthly = Array.from(byMonth.entries()).map(([month, v]) => ({ month, ...v }))
        setSalesData(monthly)
      } catch {}
    } catch (e: any) {
      toast({ title: "Status update failed", description: e?.message || String(e), variant: "destructive" })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <p className="text-black font-bold">Loading...</p>
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white grid place-items-center p-6">
        <div className="max-w-xl text-center">
          <p className="text-black font-bold">You do not have access to the Admin Dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-black">Admin Dashboard</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Total Revenue</p>
                <p className="text-3xl font-bold text-black">{formatIDR(kpi.totalRevenue)}</p>
              </div>
              <DollarSign size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Total Orders</p>
                <p className="text-3xl font-bold text-black">{kpi.totalOrders.toLocaleString()}</p>
              </div>
              <ShoppingCart size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Total Customers</p>
                <p className="text-3xl font-bold text-black">{kpi.totalCustomers.toLocaleString()}</p>
              </div>
              <Users size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Growth Rate</p>
                <p className="text-3xl font-bold text-black">{`${(kpi.growthRate).toFixed(1)}%`}</p>
              </div>
              <TrendingUp size={32} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-bold text-black mb-6">Sales Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="month" stroke="#000" />
                <YAxis stroke="#000" tickFormatter={(v: number) => Number(v).toLocaleString('id-ID')} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #0066cc" }}
                  cursor={{ fill: "rgba(0, 102, 204, 0.1)" }}
                  formatter={(value: number, name: string) => (
                    name === 'sales'
                      ? [formatIDR(Number(value)), 'sales']
                      : [Number(value).toLocaleString('id-ID'), 'orders']
                  )}
                />
                <Legend />
                <Bar dataKey="sales" fill="#0066cc" />
                <Bar dataKey="orders" fill="#cc0000" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-bold text-black mb-6">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="month" stroke="#000" />
                <YAxis stroke="#000" tickFormatter={(v: number) => Number(v).toLocaleString('id-ID')} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #0066cc" }}
                  formatter={(value: number) => [formatIDR(Number(value)), 'sales']}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#0066cc" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Orders */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-8 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-black">Customer Orders</h2>
              {filteredOrders.length < recent.length && (
                <p className="text-sm text-gray-600 font-semibold mt-1">
                  Showing {filteredOrders.length} of {recent.length} orders
                </p>
              )}
            </div>
            {recent.length > 10 && (
              <button
                onClick={() => setShowAllOrders(!showAllOrders)}
                className="px-4 py-2 text-sm font-bold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                {showAllOrders ? 'Show Less' : `View All (${filteredOrders.length})`}
              </button>
            )}
          </div>
          
          {/* Filters and Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Filter by Status</label>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2">Sort By</label>
              <select
                value={orderSortBy}
                onChange={(e) => setOrderSortBy(e.target.value as 'date' | 'amount')}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2">Order</label>
              <select
                value={orderSortOrder}
                onChange={(e) => setOrderSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setOrderStatusFilter('all')
                  setOrderSortBy('date')
                  setOrderSortOrder('desc')
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-black">Customer</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Amount</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Date</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(showAllOrders ? filteredOrders : filteredOrders.slice(0, 10)).map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-black font-bold">{transaction.customer}</td>
                    <td className="py-3 px-4 text-black font-bold">{formatIDR(transaction.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusClass(transaction.status)} min-w-[100px] text-center`}>
                          {capitalize(transaction.status)}
                        </span>
                        <select
                          className="border-2 border-gray-300 rounded-lg text-sm font-bold text-black px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                          value={transaction.status.toLowerCase()}
                          onChange={(e) => handleChangeStatus(transaction.id, e.target.value.replace(/^./, (c) => c.toUpperCase()))}
                          disabled={['delivered', 'cancelled'].includes(transaction.status.toLowerCase())}
                        >
                          {/* Current status always shown */}
                          <option value={transaction.status.toLowerCase()}>{capitalize(transaction.status)}</option>
                          
                          {/* Allowed transitions based on current status */}
                          {transaction.status.toLowerCase() === 'pending' && (
                            <>
                              <option value="paid">Paid</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                          {transaction.status.toLowerCase() === 'paid' && (
                            <>
                              <option value="shipped">Shipped</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                          {transaction.status.toLowerCase() === 'shipped' && (
                            <option value="delivered">Delivered</option>
                          )}
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-black font-bold">{transaction.date}</td>
                    <td className="py-3 px-4">
                      <a href={`/invoice?orderId=${transaction.id}`} className="text-blue-600 font-bold hover:underline">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Management */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-black">Product Management</h2>
              {filteredProducts.length < products.length && (
                <p className="text-sm text-gray-600 font-semibold mt-1">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Product
            </button>
          </div>

          {showAddProduct && (
            <form onSubmit={handleAddProduct} className="mb-6 p-4 bg-blue-50 border-2 border-blue-600 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Product name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="electronics">Electronics</option>
                  <option value="accessories">Accessories</option>
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Description</label>
                  <textarea
                    placeholder="Short description shown on product page"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full min-h-24 px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Key Features</label>
                  <textarea
                    placeholder="Comma or newline separated, e.g. Fast charging, Durable cable, 1-year warranty"
                    value={newProduct.features}
                    onChange={(e) => setNewProduct({ ...newProduct, features: e.target.value })}
                    className="w-full min-h-24 px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-6 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Filters and Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Category</label>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2">Stock Status</label>
              <select
                value={productStockFilter}
                onChange={(e) => setProductStockFilter(e.target.value as any)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock (&gt;10)</option>
                <option value="low-stock">Low Stock (1-10)</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2">Sort By</label>
              <select
                value={productSortBy}
                onChange={(e) => setProductSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="rating">Rating</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-black mb-2">Order</label>
              <select
                value={productSortOrder}
                onChange={(e) => setProductSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setProductCategoryFilter('all')
                  setProductStockFilter('all')
                  setProductSortBy('name')
                  setProductSortOrder('asc')
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
              >
                Reset
              </button>
            </div>
          </div>

          {filteredProducts.length > 10 && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                className="px-4 py-2 text-sm font-bold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                {showAllProducts ? 'Show Less' : `View All Products (${filteredProducts.length})`}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-black">Product Name</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Price</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Stock</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Rating</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 10)).map((product) => (
                  <tr key={product.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-black font-bold">{product.name}</td>
                    <td className="py-3 px-4 text-black font-bold">{formatIDR(product.price)}</td>
                    <td className="py-3 px-4 text-black font-bold">{product.stock}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={`${i < Math.floor((reviewStats[product.id]?.average ?? product.rating)) ? "fill-red-600 text-red-600" : "text-gray-300"}`}
                          />
                        ))}
                        <span className="text-sm font-bold text-black ml-1">({(reviewStats[product.id]?.average ?? product.rating).toFixed(1)})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditTarget(product)
                            setEditForm({ name: product.name, description: product.longDescription || "", features: (product.features||[]).join(", "), category: product.category, stock: String(product.stock) })
                            setEditImage(null)
                            setEditOpen(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition font-bold"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition font-bold"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editOpen && (
        <Backdrop>
          <h3 className="text-xl font-bold text-black mb-4">Edit Product</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editTarget || !isSupabaseConfigured() || !isAdmin) return
              const stock = Number(editForm.stock || 0)
              let imageUrl: string | undefined
              try {
                if (editImage) {
                  const filePath = `products/${Date.now()}_${editImage.name}`
                  const { error: upErr } = await supabase.storage.from('products').upload(filePath, editImage)
                  if (!upErr) {
                    const { data: pub } = await supabase.storage.from('products').getPublicUrl(filePath)
                    imageUrl = pub?.publicUrl
                  }
                }
              } catch {}

              const payload: any = {
                id: editTarget.id,
                name: editForm.name,
                long_description: editForm.description,
                features: (editForm.features || "")
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
                category: editForm.category,
                stock,
              }
              if (imageUrl) payload.image = imageUrl

              try {
                const { data: sessionData } = await supabase.auth.getSession()
                const token = sessionData?.session?.access_token
                const res = await fetch(`/api/products/${editTarget.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ ...payload, image: imageUrl ?? undefined }),
                })
                const j = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(j?.error || `Failed: ${res.status}`)
                const updated = j?.product
                setProducts((prev) => prev.map((p) => (
                  p.id === editTarget.id
                    ? {
                        ...p,
                        name: updated?.name ?? payload.name,
                        longDescription: updated?.long_description ?? payload.long_description,
                        category: updated?.category ?? payload.category,
                        stock: updated?.stock ?? payload.stock ?? p.stock,
                        inStock: (updated?.in_stock ?? ((payload.stock ?? p.stock) > 0)),
                        image: updated?.image ?? imageUrl ?? p.image,
                      }
                    : p
                )))
                setEditOpen(false)
                setEditTarget(null)
              } catch (e: any) {
                toast({ title: "Save failed", description: e?.message || String(e), variant: "destructive" })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Name</label>
                <input value={editForm.name} onChange={(e)=>setEditForm({...editForm, name:e.target.value})} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Category</label>
                <select value={editForm.category} onChange={(e)=>setEditForm({...editForm, category:e.target.value})} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold">
                  <option value="electronics">Electronics</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Stock</label>
                <input type="number" value={editForm.stock} onChange={(e)=>setEditForm({...editForm, stock:e.target.value})} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Product Image</label>
                <input type="file" accept="image/*" onChange={(e)=>setEditImage(e.target.files?.[0]||null)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Description</label>
              <textarea value={editForm.description} onChange={(e)=>setEditForm({...editForm, description:e.target.value})} className="w-full min-h-24 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold" />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Key Features</label>
              <textarea
                value={editForm.features}
                onChange={(e)=>setEditForm({...editForm, features:e.target.value})}
                placeholder="Comma or newline separated"
                className="w-full min-h-24 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-black font-bold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>{setEditOpen(false); setEditTarget(null)}} className="px-6 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Save</button>
            </div>
          </form>
        </Backdrop>
      )}
      {ConfirmDialog}
    </div>
  )
}

// Edit Modal (inline lightweight)
function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white border-2 border-gray-300 rounded-xl shadow-xl w-full max-w-2xl p-6">
        {children}
      </div>
    </div>
  )
}
