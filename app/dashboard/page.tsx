"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { User, ShoppingBag, TrendingUp, Menu, X, Edit2, Save, Package, Heart, ShieldCheck } from "lucide-react"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import { formatIDR } from "@/lib/utils"

type OrderRow = { id: string; created_at: string; status?: string | null; total?: number | null }

export default function UserDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "orders">("overview")

  const [profile, setProfile] = useState<{ full_name: string; phone?: string; address?: string; is_admin?: boolean } | null>(null)
  const [authEmail, setAuthEmail] = useState<string>("")
  const [memberSince, setMemberSince] = useState<string>("")
  const [orders, setOrders] = useState<OrderRow[]>([])

  const [editedUser, setEditedUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  const handleSaveProfile = async () => {
    try {
      if (!isSupabaseConfigured()) return
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (!uid) return
      // Update profiles table (full_name, phone, address)
      await supabase
        .from("profiles")
        .update({ full_name: editedUser.name, phone: editedUser.phone, address: editedUser.address })
        .eq("id", uid)
      // Email change: attempt to update auth email if different
      if (editedUser.email && editedUser.email !== authEmail) {
        await supabase.auth.updateUser({ email: editedUser.email })
      }
      setProfile((p) => (p ? { ...p, full_name: editedUser.name, phone: editedUser.phone, address: editedUser.address } : p))
      setAuthEmail(editedUser.email)
      setIsEditingProfile(false)
    } catch (e) {
      console.error("save profile error", e)
    }
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
  }

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) return
      const { data: auth } = await supabase.auth.getUser()
      const u = auth.user
      if (!u) return
      setAuthEmail(u.email ?? "")
      try {
        setMemberSince(
          u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : ""
        )
      } catch {}
      const { data: prof } = await supabase.from("profiles").select("full_name, phone, address, is_admin").eq("id", u.id).maybeSingle()
      setProfile(prof as any)
      setEditedUser({
        name: (prof as any)?.full_name ?? u.email ?? "",
        email: u.email ?? "",
        phone: (prof as any)?.phone ?? "",
        address: (prof as any)?.address ?? "",
      })
      const { data: ords, error } = await supabase
        .from("orders")
        .select("id, created_at, status, total")
        .order("created_at", { ascending: false })
      if (!error) setOrders((ords || []).map((o: any) => ({
        id: String(o.id),
        created_at: o.created_at,
        status: o.status,
        total: Number(o.total ?? 0),
      })))
    }
    load()
  }, [])

  const totalOrders = orders.length
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0)
  const recentOrders = orders.filter((o) => (o.status || "").toLowerCase() === "shipped").length

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold text-black">User Profile</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-black">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap md:flex-nowrap">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === "overview" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === "profile" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Order History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
              {/* User Info Card */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={32} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-black">{profile?.full_name ?? authEmail}</h2>
                    <p className="text-sm text-black font-semibold">{authEmail}</p>
                  </div>
                </div>
                <p className="text-sm text-black font-semibold">Member since {memberSince}</p>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Edit Profile
                </button>
              </div>

              {/* Stats Cards */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm">Total Orders</h3>
                  <ShoppingBag size={24} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-black">{totalOrders}</p>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm">Total Spent</h3>
                  <TrendingUp size={24} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-black">{formatIDR(totalSpent)}</p>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm">Recent Orders</h3>
                  <Package size={24} className="text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-black">{recentOrders}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-black mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link
                  href="/catalog"
                  className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-600 font-bold hover:bg-blue-100 transition text-center"
                >
                  Continue Shopping
                </Link>
                <Link
                  href="/purchase-history"
                  className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-green-600 font-bold hover:bg-green-100 transition text-center"
                >
                  View Purchase History
                </Link>
                <Link
                  href="/cart"
                  className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg text-orange-600 font-bold hover:bg-orange-100 transition text-center"
                >
                  Go to Cart
                </Link>
                <Link
                  href="/wishlist"
                  className="p-4 bg-pink-50 border-2 border-pink-300 rounded-lg text-pink-600 font-bold hover:bg-pink-100 transition text-center flex items-center justify-center gap-2"
                >
                  <Heart size={16} /> Wishlist
                </Link>
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg text-purple-700 font-bold hover:bg-purple-100 transition text-center flex items-center justify-center gap-2 md:col-span-2"
                  >
                    <ShieldCheck size={16} /> Admin Page
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Personal Information</h2>
              <button
                onClick={() => (isEditingProfile ? handleSaveProfile : setIsEditingProfile(true))}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                {isEditingProfile ? (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit2 size={18} />
                    Edit Profile
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-black font-bold mb-2">Full Name</label>
                <input
                  type="text"
                  value={isEditingProfile ? editedUser.name : (profile?.full_name ?? authEmail)}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, name: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Email Address</label>
                <input
                  type="email"
                  value={isEditingProfile ? editedUser.email : authEmail}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, email: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={isEditingProfile ? editedUser.phone : (profile?.phone ?? "")}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, phone: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Address</label>
                <textarea
                  value={isEditingProfile ? editedUser.address : (profile?.address ?? "")}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, address: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 resize-none"
                  rows={3}
                />
              </div>

              {isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="w-full py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-2xl font-bold text-black mb-6">Order History</h2>
            <div className="space-y-4">
              {sampleOrders.map((order) => (
                <div
                  key={order.id}
                  className="border-2 border-gray-300 rounded-lg p-4 hover:shadow-md transition bg-white"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-black text-lg">{order.id}</h3>
                      <p className="text-sm text-black font-semibold">{order.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-black font-semibold">Total</p>
                        <p className="font-bold text-black text-lg">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.total)}</p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full font-bold text-sm capitalize ${statusColors[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full text-left py-2 px-3 bg-gray-50 rounded-lg text-blue-600 hover:bg-gray-100 font-bold transition"
                  >
                    {expandedOrder === order.id ? "Hide Details" : "View Details"}
                  </button>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-300">
                      <div className="space-y-3 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-black font-semibold">
                            <span>
                              {item.productName} x{item.quantity}
                            </span>
                            <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      {order.rating && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-4 border-2 border-blue-200">
                          <p className="font-bold text-black text-sm mb-1">Your Rating</p>
                          <div className="flex gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={i < order.rating! ? "text-yellow-400 text-lg" : "text-gray-300 text-lg"}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          {order.review && <p className="text-sm text-black font-semibold">{order.review}</p>}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Link
                          href="/invoice"
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition text-center"
                        >
                          View Invoice
                        </Link>
                        <button className="flex-1 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition">
                          Reorder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
