"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "Summer Collection",
      subtitle: "Discover the latest trends",
      color: "bg-blue-600",
    },
    {
      title: "Flash Sale",
      subtitle: "Up to 50% off selected items",
      color: "bg-red-600",
    },
    {
      title: "New Arrivals",
      subtitle: "Fresh products every week",
      color: "bg-blue-700",
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className="relative w-full h-96 overflow-hidden rounded-xl border-2 border-gray-200 shadow-lg">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          } ${slide.color}`}
        >
          <div className="flex flex-col items-center justify-center h-full text-white">
            <h1 className="text-5xl font-bold text-balance">{slide.title}</h1>
            <p className="text-xl mt-4 font-semibold">{slide.subtitle}</p>
          </div>
        </div>
      ))}

      {/* Carousel Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white hover:bg-gray-100 rounded-full transition shadow-md"
      >
        <ChevronLeft size={24} className="text-black" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white hover:bg-gray-100 rounded-full transition shadow-md"
      >
        <ChevronRight size={24} className="text-black" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition ${index === currentSlide ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  )
}
