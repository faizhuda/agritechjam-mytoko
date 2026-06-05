"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link"
import { Menu, X, ShoppingCart, MessageCircle, Search, Heart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { normalizeSearch } from "@/lib/utils"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"

export default function Navbar() {
  const { cartItems } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [displayName, setDisplayName] = useState<string>("Profile")
  const [query, setQuery] = useState("")
  const router = useRouter()
  // Keep navbar search in sync with URL and Catalog client updates without using
  // useSearchParams (to avoid Suspense constraints in all pages).
  React.useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window === "undefined") return
      const path = window.location.pathname
      const sp = new URLSearchParams(window.location.search).get("search") ?? ""
      if (path.startsWith("/catalog") && sp !== query) setQuery(sp)
    }
    syncFromUrl()
    const handler = () => syncFromUrl()
    window.addEventListener("popstate", handler)
    window.addEventListener("nav:search", handler)
    return () => {
      window.removeEventListener("popstate", handler)
      window.removeEventListener("nav:search", handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Load display name and admin flag
  React.useEffect(() => {
    const load = async () => {
      if (!user || !isSupabaseConfigured()) {
        setDisplayName("Profile")
        setIsAdmin(false)
        return
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, is_admin")
        .eq("id", user.id)
        .maybeSingle()
      const p: any = prof || {}
      // Standar: gunakan full_name jika ada, jika tidak gabungan first_name + last_name, jika tidak email
      const dn = (p.full_name && p.full_name.trim().length > 0)
        ? p.full_name
        : [p.first_name, p.last_name].filter(Boolean).join(" ") || (user.email ?? "Profile")
      setDisplayName(dn)
      setIsAdmin(Boolean(p?.is_admin))
    }
    load()
  }, [user])
  

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 font-black tracking-tight text-xl uppercase bg-yellow-300 border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            MyToko
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/catalog"
              className="text-sm font-black text-black uppercase hover:underline underline-offset-4 decoration-2"
            >
              Catalog
            </Link>
            
            <Suspense fallback={null}>
              <form
                className="relative"
                onSubmit={(e) => {
                  e.preventDefault()
                  const q = normalizeSearch(query)
                  if (q) router.push(`/catalog?search=${encodeURIComponent(q)}`)
                  else router.push(`/catalog`)
                }}
              >
                <input
                  type="text"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-56 px-4 py-1.5 pr-9 border-2 border-black bg-white text-sm text-black placeholder-gray-700 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 font-bold"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-3 top-2.5 text-black hover:text-blue-600 cursor-pointer transition-colors"
                >
                  <Search size={16} className="stroke-[2.5]" />
                </button>
              </form>
            </Suspense>

            <button
              className="flex items-center justify-center p-2 text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/wishlist')
              }}
              title="Wishlist"
            >
              <Heart size={18} className="stroke-[2.5] hover:text-rose-500 hover:fill-rose-500 transition-colors" />
            </button>

            <button
              className="flex items-center justify-center p-2 text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 relative"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/cart')
              }}
              title="Cart"
            >
              <ShoppingCart size={18} className="stroke-[2.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-300 text-black border border-black text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {cartCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-black text-black uppercase hover:underline underline-offset-4 decoration-2"
              >
                Admin
              </Link>
            )}

            <a
              href="https://wa.me/6287787128257"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              title="Chat Support"
            >
              <MessageCircle size={18} className="stroke-[2.5]" />
            </a>

            <div className="h-6 w-[2px] bg-black" />

            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-black text-black uppercase hover:underline underline-offset-4 decoration-2"
                >
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-1.5 text-sm bg-rose-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black uppercase"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-1.5 text-sm bg-blue-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black uppercase"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
          >
            {isOpen ? <X size={20} className="stroke-[2.5]" /> : <Menu size={20} className="stroke-[2.5]" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 bg-stone-50 border-t-2 border-black pt-2">
            <Link
              href="/catalog"
              className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-2"
            >
              Catalog
            </Link>
            <button
              className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-2 w-[calc(100%-1rem)] text-left"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/wishlist')
              }}
            >
              Wishlist
            </button>
            <button
              className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-2 w-[calc(100%-1rem)] text-left"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/cart')
              }}
            >
              Cart ({cartCount})
            </button>
            {isAdmin && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-2"
              >
                Admin Dashboard
              </Link>
            )}
            <a
              href="https://wa.me/6287787128257"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-2"
            >
              Chat Support
            </a>
            {user ? (
              <div className="space-y-2 px-2 pt-2">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-black hover:bg-yellow-200 border-2 border-black font-black uppercase bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-2 bg-rose-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="block px-4 py-2 bg-blue-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center font-black uppercase mx-2"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
