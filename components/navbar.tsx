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
    <nav className="sticky top-0 z-50 glass-header shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-lg">M</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MyToko</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/catalog" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
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
                  className="w-56 px-4 py-1.5 pr-9 border border-gray-200 rounded-full bg-gray-50/70 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white focus:w-64 transition-all duration-300 font-medium"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-3 top-2 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  <Search size={16} />
                </button>
              </form>
            </Suspense>

            <button
              className="flex items-center gap-2 p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all duration-200"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/wishlist')
              }}
              title="Wishlist"
            >
              <Heart size={20} className="transition-transform active:scale-90" />
            </button>

            <button
              className="flex items-center gap-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 relative"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/cart')
              }}
              title="Cart"
            >
              <ShoppingCart size={20} className="transition-transform active:scale-90" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-md animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link href="/admin" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
                Admin
              </Link>
            )}

            <a
              href="https://wa.me/6287787128257"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-all duration-200"
              title="Chat Support"
            >
              <MessageCircle size={20} />
            </a>

            <div className="h-4 w-[1px] bg-gray-200" />

            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-1.5 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors font-semibold shadow-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-semibold shadow-md shadow-blue-500/10"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition text-black font-bold"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 bg-white">
            <Link
              href="/catalog"
              className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold"
            >
              Catalog
            </Link>
            <button
              className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold w-full text-left"
              onClick={() => {
                if (!user) router.push('/login')
                else router.push('/wishlist')
              }}
            >
              Wishlist
            </button>
            <button
              className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold w-full text-left"
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
                className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold"
              >
                Admin Dashboard
              </Link>
            )}
            <a
              href="https://wa.me/6287787128257"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold"
            >
              Chat Support
            </a>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold"
                >
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-bold"
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
