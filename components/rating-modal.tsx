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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border-4 border-black max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none relative">
        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2 bg-yellow-200 -mx-8 -mt-8 p-4">
          <h2 className="text-xl font-black text-black uppercase tracking-tight">Rate Your Experience</h2>
          <button 
            onClick={onClose} 
            className="text-black border-2 border-black p-1 bg-white hover:bg-stone-50 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-none"
            aria-label="Close modal"
          >
            <X size={16} className="stroke-[3]" />
          </button>
        </div>

        {orderNumber && (
          <p className="text-xs font-black text-black mb-6 uppercase bg-stone-100 border-2 border-black px-2 py-1.5 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Order: <span className="underline">{orderNumber}</span>
          </p>
        )}

        <div className="space-y-6">
          {/* Product Rating */}
          <div>
            <label className="block text-xs font-black text-black mb-3 uppercase">How would you rate the product?</label>
            <div className="flex gap-2.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatings((prev) => ({ ...prev, productRating: star }))}
                  className="transition-transform hover:scale-110 active:translate-y-[1px]"
                  type="button"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={32}
                    className={`${
                      star <= ratings.productRating 
                        ? "fill-amber-400 text-amber-400 stroke-black stroke-[1.5]" 
                        : "fill-transparent text-stone-300 stroke-stone-400 stroke-[1.5]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-black text-black mb-3 uppercase">Additional Comments (Optional)</label>
            <textarea
              value={ratings.comment}
              onChange={(e) => setRatings((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your feedback..."
              className="w-full px-4 py-3 border-2 border-black bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none"
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 px-4 py-3 border-2 border-black bg-white hover:bg-stone-50 text-black rounded-none font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            className="flex-1 px-4 py-3 bg-blue-300 border-2 border-black text-black rounded-none font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  )
}
