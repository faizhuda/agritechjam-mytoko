"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "PREMIUM TECH & ELECTRONICS",
      subtitle: "Level up your productivity with state-of-the-art devices",
      bgColor: "bg-yellow-200",
      textColor: "text-black",
      badge: "FEATURED COLLECTION",
      badgeColor: "bg-orange-300"
    },
    {
      title: "FLASH SALE EXTRAVAGANZA",
      subtitle: "Limited time offer — Save up to 50% on all categories",
      bgColor: "bg-orange-200",
      textColor: "text-black",
      badge: "SPECIAL EVENT",
      badgeColor: "bg-cyan-300"
    },
    {
      title: "FRESH NEW ARRIVALS",
      subtitle: "Handpicked quality items updated every single week",
      bgColor: "bg-cyan-200",
      textColor: "text-black",
      badge: "JUST ADDED",
      badgeColor: "bg-pink-300"
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
    <div className="relative w-full h-[26rem] overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group">
      {/* Background Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000d_1px,transparent_1px),linear-gradient(to_bottom,#0000000d_1px,transparent_1px)] bg-[size:16px_16px] z-10 pointer-events-none" />

      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${slide.bgColor} ${
            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-100 pointer-events-none"
          }`}
        >
          {/* Slide Content with fadeInUp animation */}
          {index === currentSlide && (
            <div className="flex flex-col items-center justify-center h-full text-black px-6 md:px-16 animate-fade-in-up">
              {slide.badge && (
                <span className={`px-4 py-1.5 ${slide.badgeColor} border-2 border-black text-black rounded-none text-xs font-black uppercase tracking-wider mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                  {slide.badge}
                </span>
              )}
              <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-balance max-w-4xl leading-tight uppercase">
                {slide.title}
              </h1>
              <p className="text-center text-sm sm:text-base md:text-lg mt-4 max-w-2xl text-black/90 font-bold leading-relaxed">
                {slide.subtitle}
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/catalog"
                  className="px-6 py-3 bg-black text-white border-2 border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(254,240,138,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all uppercase"
                >
                  Shop Now
                </Link>
                <Link
                  href="/catalog"
                  className="px-6 py-3 bg-white text-black border-2 border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all uppercase"
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
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-15 p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
      >
        <ChevronLeft size={20} className="text-black stroke-[3]" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-15 p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
      >
        <ChevronRight size={20} className="text-black stroke-[3]" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-15">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3.5 h-3.5 border-2 border-black transition-all duration-300 ${
              index === currentSlide ? "bg-black" : "bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
