"use client"

import { useState } from "react"
import Link from "next/link"
import { User, ShoppingBag, TrendingUp, Menu, X, Edit2, Save, Package } from "lucide-react"
import { sampleOrders } from "@/lib/product-data"

export default function UserDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "orders">("overview")

  const [user, setUser] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main St, New York, NY 10001",
    memberSince: "January 2024",
    totalOrders: 12,
    totalSpent: "$2,847.50",
  })

  const [editedUser, setEditedUser] = useState(user)

  const handleSaveProfile = () => {
    setUser(editedUser)
    setIsEditingProfile(false)
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold text-black">User Dashboard</h1>
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
                    <h2 className="font-bold text-lg text-black">{user.name}</h2>
                    <p className="text-sm text-black font-semibold">{user.email}</p>
                  </div>
                </div>
                <p className="text-sm text-black font-semibold">Member since {user.memberSince}</p>
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
                <p className="text-3xl font-bold text-black">{user.totalOrders}</p>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm">Total Spent</h3>
                  <TrendingUp size={24} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-black">{user.totalSpent}</p>
              </div>

              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-black text-sm">Recent Orders</h3>
                  <Package size={24} className="text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-black">
                  {sampleOrders.filter((o) => o.status === "shipped").length}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-black mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  value={isEditingProfile ? editedUser.name : user.name}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, name: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Email Address</label>
                <input
                  type="email"
                  value={isEditingProfile ? editedUser.email : user.email}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, email: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={isEditingProfile ? editedUser.phone : user.phone}
                  onChange={(e) => isEditingProfile && setEditedUser({ ...editedUser, phone: e.target.value })}
                  disabled={!isEditingProfile}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-black font-bold mb-2">Address</label>
                <textarea
                  value={isEditingProfile ? editedUser.address : user.address}
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
                        <p className="font-bold text-black text-lg">${order.total.toFixed(2)}</p>
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
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
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
