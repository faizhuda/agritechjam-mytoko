"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "Premium Tech & Electronics",
      subtitle: "Level up your productivity with state-of-the-art devices",
      gradient: "from-indigo-600 via-purple-600 to-pink-600",
      badge: "Featured Collection"
    },
    {
      title: "Flash Sale Extravaganza",
      subtitle: "Limited time offer — Save up to 50% on all categories",
      gradient: "from-rose-500 via-red-600 to-orange-500",
      badge: "Special Event"
    },
    {
      title: "Fresh New Arrivals",
      subtitle: "Handpicked quality items updated every single week",
      gradient: "from-emerald-500 via-teal-600 to-blue-600",
      badge: "Just Added"
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className="relative w-full h-96 overflow-hidden rounded-2xl border border-gray-200/50 shadow-xl group">
      {/* Background Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] z-10 pointer-events-none" />

      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out bg-gradient-to-r ${slide.gradient} ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
          }`}
        >
          {/* Slide Content with fadeInUp animation */}
          {index === currentSlide && (
            <div className="flex flex-col items-center justify-center h-full text-white px-6 md:px-16 animate-fade-in-up">
              {slide.badge && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
                  {slide.badge}
                </span>
              )}
              <h1 className="text-center text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-balance max-w-4xl drop-shadow-sm leading-tight">
                {slide.title}
              </h1>
              <p className="text-center text-base sm:text-lg md:text-xl mt-4 max-w-2xl text-white/95 font-medium leading-relaxed drop-shadow-sm">
                {slide.subtitle}
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/catalog"
                  className="px-6 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition duration-150"
                >
                  Shop Now
                </Link>
                <Link
                  href="/catalog"
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/25 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition duration-150"
                >
                  Browse Store
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Carousel Controls */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-15 p-2 bg-white/90 hover:bg-white backdrop-blur-sm hover:scale-110 rounded-full transition shadow-md opacity-0 group-hover:opacity-100 duration-300"
      >
        <ChevronLeft size={20} className="text-gray-800" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-15 p-2 bg-white/90 hover:bg-white backdrop-blur-sm hover:scale-110 rounded-full transition shadow-md opacity-0 group-hover:opacity-100 duration-300"
      >
        <ChevronRight size={20} className="text-gray-800" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-15">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? "w-6 bg-white" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  )
}
