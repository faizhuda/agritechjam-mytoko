"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"

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
    try {
      const raw = localStorage.getItem(storageKey)
      setWishlistItems(raw ? (JSON.parse(raw) as WishlistItem[]) : [])
    } catch {
      setWishlistItems([])
    }
  }, [storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(wishlistItems))
    } catch {}
  }, [storageKey, wishlistItems])

  const addToWishlist = (item: WishlistItem) => {
    setWishlistItems((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]))
  }
  const removeFromWishlist = (id: number) => {
    setWishlistItems((prev) => prev.filter((x) => x.id !== id))
  }
  const clearWishlist = () => setWishlistItems([])

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
