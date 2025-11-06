"use client"

import { Star, X } from "lucide-react"
import { useState } from "react"

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (ratings: RatingData) => void
  orderNumber?: string
}

export interface RatingData {
  productRating: number
  comment: string
}

export default function RatingModal({ isOpen, onClose, onSubmit, orderNumber }: RatingModalProps) {
  const [ratings, setRatings] = useState<RatingData>({
    productRating: 0,
    comment: "",
  })

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit(ratings)
    setRatings({
      productRating: 0,
      comment: "",
    })
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 border-2 border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Rate Your Experience</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-black transition">
            <X size={24} />
          </button>
        </div>

        {orderNumber && <p className="text-sm text-gray-700 mb-6">Order: {orderNumber}</p>}

        <div className="space-y-6">
          {/* Product Rating */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">How would you rate the product?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatings((prev) => ({ ...prev, productRating: star }))}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`${star <= ratings.productRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Additional Comments (Optional)</label>
            <textarea
              value={ratings.comment}
              onChange={(e) => setRatings((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your feedback..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-black rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  )
}
