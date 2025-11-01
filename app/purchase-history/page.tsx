"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Star, CheckCircle2 } from "lucide-react"

interface Purchase {
  id: string
  orderNumber: string
  date: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  status: "Delivered" | "Processing" | "Shipped"
  rating?: number
  arrivedConfirmed?: boolean
}

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([
    {
      id: "1",
      orderNumber: "#ORD-2024-001234",
      date: "2024-10-15",
      items: [
        { name: "Premium Headphones", quantity: 1, price: 299.99 },
        { name: "Wireless Mouse", quantity: 2, price: 49.99 },
      ],
      total: 449.97,
      status: "Delivered",
      arrivedConfirmed: true,
      rating: 5,
    },
    {
      id: "2",
      orderNumber: "#ORD-2024-001233",
      date: "2024-10-08",
      items: [
        { name: "USB-C Cable", quantity: 3, price: 12.99 },
        { name: "Phone Stand", quantity: 1, price: 24.99 },
      ],
      total: 113.96,
      status: "Delivered",
      arrivedConfirmed: false,
    },
    {
      id: "3",
      orderNumber: "#ORD-2024-001232",
      date: "2024-09-28",
      items: [{ name: "Wireless Mouse", quantity: 1, price: 49.99 }],
      total: 54.99,
      status: "Shipped",
      arrivedConfirmed: false,
    },
  ])

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800"
      case "Shipped":
        return "bg-blue-100 text-blue-800"
      case "Processing":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleConfirmArrival = (purchaseId: string) => {
    setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, arrivedConfirmed: true } : p)))
  }

  const handleSubmitRating = (purchaseId: string) => {
    setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, rating, arrivedConfirmed: true } : p)))
    setShowRatingModal(null)
    setRating(0)
    setReview("")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Purchase History</h1>
          <p className="text-black text-lg font-semibold">View all your previous orders and transactions</p>
        </div>

        {purchases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-300">
            <p className="text-black text-lg font-semibold mb-4">No purchases yet</p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white border-2 border-gray-300 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedOrder(expandedOrder === purchase.id ? null : purchase.id)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-xs font-bold text-black uppercase mb-1">Order Number</p>
                      <p className="text-lg font-bold text-black">{purchase.orderNumber}</p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-black uppercase mb-1">Date</p>
                      <p className="text-base text-black font-bold">
                        {new Date(purchase.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-black uppercase mb-1">Items</p>
                      <p className="text-base text-black font-bold">
                        {purchase.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-black uppercase mb-1">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(purchase.status)}`}
                      >
                        {purchase.status}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-black uppercase mb-1">Total</p>
                      <p className="text-xl font-bold text-blue-600">${purchase.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {expandedOrder === purchase.id && (
                  <div className="border-t-2 border-gray-300 bg-gray-50 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-black mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {purchase.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-gray-300"
                          >
                            <div>
                              <p className="font-bold text-black">{item.name}</p>
                              <p className="text-sm text-black font-semibold">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-bold text-black">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {purchase.status === "Delivered" && !purchase.arrivedConfirmed && (
                      <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-300">
                        <button
                          onClick={() => handleConfirmArrival(purchase.id)}
                          className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={20} />
                          Confirm Order Arrived
                        </button>
                      </div>
                    )}

                    {purchase.status === "Delivered" && purchase.arrivedConfirmed && !purchase.rating && (
                      <div className="mb-6 p-4 bg-white rounded-lg border-2 border-yellow-300">
                        <button
                          onClick={() => setShowRatingModal(purchase.id)}
                          className="w-full py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 transition"
                        >
                          Rate or Review This Order
                        </button>
                      </div>
                    )}

                    {purchase.rating && (
                      <div className="mb-6 p-4 bg-white rounded-lg border-2 border-green-300">
                        <h3 className="text-base font-bold text-black mb-3">Your Rating</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={24}
                                className={`${
                                  star <= purchase.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-black font-bold">{purchase.rating}/5</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <Link
                        href={`/invoice?order=${purchase.orderNumber}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                      >
                        <Eye size={18} />
                        View Invoice
                      </Link>
                      <Link
                        href="/catalog"
                        className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition"
                      >
                        Reorder
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-2 border-gray-300">
              <h2 className="text-2xl font-bold text-black mb-4">Rate Your Order</h2>
              <div className="mb-6">
                <p className="text-black font-bold mb-3">How would you rate this order?</p>
                <div className="flex gap-2 justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                      <Star
                        size={32}
                        className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-black font-bold mb-2">Additional Review (Optional)</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Share your thoughts about this order..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRatingModal(null)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitRating(showRatingModal)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
