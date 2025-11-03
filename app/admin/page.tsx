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
  const [editForm, setEditForm] = useState<{ name: string; description: string; category: string; stock: string }>({ name: "", description: "", category: "electronics", stock: "" })
  const [editImage, setEditImage] = useState<File | null>(null)

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

      // KPI
      const totalRevenue = orderRows.reduce((s, o) => s + (o.total || 0), 0)
      const totalOrders = orderRows.length
      const totalCustomers = new Set(orderRows.map((o) => o.user_id)).size
      const now = new Date()
      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const prevStart30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const last30 = orderRows.filter((o) => new Date(o.created_at) >= start30)
      const prev30 = orderRows.filter((o) => new Date(o.created_at) < start30 && new Date(o.created_at) >= prevStart30)
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
      for (const o of orderRows) {
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

      // Recent transactions; customer names provided by API
      const recentOrders = (apiOrders as any[]).slice(0, 8)
      const txns: TxnRow[] = recentOrders.map((o: any) => ({
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
    } else if (error) {
      alert(error.message)
      return
    }
    setShowAddProduct(false)
    setImageFile(null)
    setNewProduct({ name: "", price: "", category: "electronics", stock: "", description: "", features: "" })
  }

  const handleEditProduct = async (p: Product) => {
    if (!isSupabaseConfigured() || !isAdmin) return
    const newStockStr = prompt(`New stock for ${p.name}`, String(p.stock))
    if (newStockStr == null) return
    const stock = Number(newStockStr)
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || `Failed: ${res.status}`)
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock, inStock: stock > 0 } : x)))
    } catch (e: any) {
      alert(e?.message || String(e))
    }
  }

  const handleDeleteProduct = async (p: Product) => {
    if (!isSupabaseConfigured() || !isAdmin) return
  if (!confirm(`Delete product "${p.name}"?`)) return
    const { error } = await supabase.from("products").delete().eq("id", p.id)
    if (!error) {
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
    } else {
      alert(error.message)
    }
  }

  const handleChangeStatus = async (orderId: string, next: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.toLowerCase() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `Failed to set status: ${res.status}`)
      }
      setRecent((prev) => prev.map((t) => (t.id === orderId ? { ...t, status: next } : t)))
    } catch (e: any) {
      alert(e?.message || String(e))
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
          <h2 className="text-xl font-bold text-black mb-6">Customer Orders</h2>
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
                {recent.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-black font-bold">{transaction.customer}</td>
                    <td className="py-3 px-4 text-black font-bold">{formatIDR(transaction.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusClass(transaction.status)} text-center`}>
                          {capitalize(transaction.status)}
                        </span>
                        <select
                          className="border-2 border-gray-300 rounded-lg text-sm font-bold text-black text-center px-2 py-1"
                          value={transaction.status.toLowerCase()}
                          onChange={(e) => handleChangeStatus(transaction.id, e.target.value.replace(/^./, (c) => c.toUpperCase()))}
                        >
                          {['pending','paid','shipped','delivered','cancelled'].map((s) => (
                            <option key={s} value={s}>{capitalize(s)}</option>
                          ))}
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
            <h2 className="text-xl font-bold text-black">Product Management</h2>
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
                {products.map((product) => (
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
                            setEditForm({ name: product.name, description: product.longDescription || "", category: product.category, stock: String(product.stock) })
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
                name: editForm.name,
                long_description: editForm.description,
                category: editForm.category,
                stock,
              }
              if (imageUrl) payload.image = imageUrl

              try {
                const res = await fetch(`/api/products/${editTarget.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
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
                alert(e?.message || String(e))
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
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>{setEditOpen(false); setEditTarget(null)}} className="px-6 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Save</button>
            </div>
          </form>
        </Backdrop>
      )}
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
