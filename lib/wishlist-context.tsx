"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { isSupabaseConfigured } from "@/lib/supabase/browser"
import { addToWishlist as dbAdd, clearWishlist as dbClear, listWishlist as dbList, removeFromWishlist as dbRemove } from "@/lib/db/wishlist"

export type WishlistItem = {
  id: number
  name: string
  price: number
  image?: string
  rating?: number
  reviews?: number
}

interface WishlistContextType {
  wishlistItems: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: number) => void
  clearWishlist: () => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const storageKey = useMemo(() => (user ? `wishlist:${user.id}` : `wishlist:guest`), [user?.id])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    const load = async () => {
      if (user && isSupabaseConfigured()) {
        const rows = await dbList(user.id)
        setWishlistItems(
          rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, image: r.image, rating: r.rating, reviews: r.reviews }))
        )
      } else {
        try {
          const raw = localStorage.getItem(storageKey)
          setWishlistItems(raw ? (JSON.parse(raw) as WishlistItem[]) : [])
        } catch {
          setWishlistItems([])
        }
      }
    }
    load()
  }, [storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(wishlistItems))
    } catch {}
  }, [storageKey, wishlistItems])

  const addToWishlist = (item: WishlistItem) => {
    setWishlistItems((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]))
    if (user && isSupabaseConfigured()) {
      dbAdd(user.id, item.id).catch((e) => console.error("wishlist dbAdd error", e))
    }
  }
  const removeFromWishlist = (id: number) => {
    setWishlistItems((prev) => prev.filter((x) => x.id !== id))
    if (user && isSupabaseConfigured()) {
      dbRemove(user.id, id).catch((e) => console.error("wishlist dbRemove error", e))
    }
  }
  const clearWishlist = () => {
    setWishlistItems([])
    if (user && isSupabaseConfigured()) {
      dbClear(user.id).catch((e) => console.error("wishlist dbClear error", e))
    }
  }

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider")
  return ctx
}
