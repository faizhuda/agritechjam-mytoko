"use client"

import type React from "react"

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
import { productDatabase } from "@/lib/product-data"
import { useState } from "react"

export default function AdminDashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "electronics",
  })

  const salesData = [
    { month: "Jan", sales: 4000, orders: 240 },
    { month: "Feb", sales: 3000, orders: 221 },
    { month: "Mar", sales: 2000, orders: 229 },
    { month: "Apr", sales: 2780, orders: 200 },
    { month: "May", sales: 1890, orders: 218 },
    { month: "Jun", sales: 2390, orders: 250 },
  ]

  const recentTransactions = [
    { id: 1, customer: "John Doe", amount: "$299.99", status: "Completed", date: "2024-01-15" },
    { id: 2, customer: "Jane Smith", amount: "$149.99", status: "Pending", date: "2024-01-14" },
    { id: 3, customer: "Bob Johnson", amount: "$79.99", status: "Completed", date: "2024-01-13" },
    { id: 4, customer: "Alice Brown", amount: "$199.99", status: "Completed", date: "2024-01-12" },
  ]

  const getStatusColor = (status: string) => {
    return status === "Completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
  }

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Adding product:", newProduct)
    setShowAddProduct(false)
    setNewProduct({ name: "", price: "", category: "electronics" })
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
                <p className="text-3xl font-bold text-black">$24,580</p>
              </div>
              <DollarSign size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Total Orders</p>
                <p className="text-3xl font-bold text-black">1,234</p>
              </div>
              <ShoppingCart size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Total Customers</p>
                <p className="text-3xl font-bold text-black">856</p>
              </div>
              <Users size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-black">Growth Rate</p>
                <p className="text-3xl font-bold text-black">+12.5%</p>
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
                <YAxis stroke="#000" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #0066cc" }}
                  cursor={{ fill: "rgba(0, 102, 204, 0.1)" }}
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
                <YAxis stroke="#000" />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "2px solid #0066cc" }} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#0066cc" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-8 shadow-md">
          <h2 className="text-xl font-bold text-black mb-6">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-black">Customer</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Amount</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-black font-bold">{transaction.customer}</td>
                    <td className="py-3 px-4 text-black font-bold">{transaction.amount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(transaction.status)}`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-black font-bold">{transaction.date}</td>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="px-4 py-2 border-2 border-blue-600 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="electronics">Electronics</option>
                  <option value="accessories">Accessories</option>
                </select>
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
                {productDatabase.slice(0, 6).map((product) => (
                  <tr key={product.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-black font-bold">{product.name}</td>
                    <td className="py-3 px-4 text-black font-bold">${product.price}</td>
                    <td className="py-3 px-4 text-black font-bold">{product.stock}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={`${i < Math.floor(product.rating) ? "fill-red-600 text-red-600" : "text-gray-300"}`}
                          />
                        ))}
                        <span className="text-sm font-bold text-black ml-1">({product.rating})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition font-bold">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded transition font-bold">
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
    </div>
  )
}
