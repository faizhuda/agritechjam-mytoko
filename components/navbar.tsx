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
    <nav className="sticky top-0 z-50 bg-white border-b-2 border-gray-300 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <span className="text-2xl font-bold text-blue-600">MyToko</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/catalog" className="text-black hover:text-blue-600 transition font-bold">
              Catalog
            </Link>
            <Link href="/wishlist" className="flex items-center gap-2 text-black hover:text-pink-600 transition font-bold">
            <Heart size={20} className="text-pink-500" />
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-2 text-black hover:text-blue-600 transition font-bold relative"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
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
                  className="px-4 py-2 pr-9 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-2 top-2.5 text-black hover:text-blue-600 cursor-pointer"
                >
                  <Search size={18} />
                </button>
              </form>
            </Suspense>
            {isAdmin && (
              <Link href="/admin" className="text-black hover:text-blue-600 transition font-bold">
                Admin
              </Link>
            )}
            <a
              href="https://wa.me/6287787128257"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-blue-600 transition"
            >
              <MessageCircle size={20} />
            </a>
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-black hover:text-blue-600 transition font-bold">
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
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
            <Link href="/cart" className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg transition font-bold">
              Cart ({cartCount})
            </Link>
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
