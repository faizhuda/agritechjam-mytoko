"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { isSupabaseConfigured } from "@/lib/supabase/browser"
import { fetchProductsByIds } from "@/lib/db/products"
import { useAuth } from "@/hooks/use-auth"
import {
  listCartItems as dbList,
  addToCart as dbAdd,
  removeFromCart as dbRemove,
  updateCartItem as dbUpdate,
  clearCart as dbClear,
} from "@/lib/db/cart"

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const { user } = useAuth()
  const syncedOnLogin = useRef(false)

  // Load from DB when user logs in
  useEffect(() => {
    const load = async () => {
      if (!user || !isSupabaseConfigured()) return
      // If there are local items (from guest session), try to push them to DB once
      if (!syncedOnLogin.current && cartItems.length > 0) {
        for (const item of cartItems) {
          await dbAdd(user.id, item.id, item.quantity)
        }
        syncedOnLogin.current = true
      }
      const rows = await dbList(user.id)
      setCartItems(
        rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, quantity: r.quantity, image: r.image }))
      )
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Rehydrate guest cart item details (name/price/image) from DB to avoid stale snapshots
  useEffect(() => {
    const rehydrate = async () => {
      if (user) return // user-synced path already handled above
      if (!isSupabaseConfigured()) return
      const ids = cartItems.map((i) => i.id)
      if (ids.length === 0) return
      try {
        const fresh = await fetchProductsByIds(ids)
        if (!fresh || fresh.length === 0) return
        const byId = new Map(fresh.map((p) => [p.id, p]))
        setCartItems((prev) =>
          prev.map((i) => {
            const p = byId.get(i.id)
            if (!p) return i
            // Only update if values changed to avoid unnecessary re-renders
            if (i.name === p.name && i.price === p.price && i.image === p.image) return i
            return { ...i, name: p.name, price: p.price, image: p.image }
          })
        )
      } catch (e) {
        console.error("cart rehydrate failed", e)
      }
    }
    // Fire-and-forget; doesn't need to block UI
    rehydrate()
    // Only re-run when ids set changes to limit calls
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cartItems.map((i) => i.id).join(",")])

  const addToCart = (item: CartItem) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)
      if (existingItem) {
        return prevItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i))
      }
      return [...prevItems, item]
    })
    // Persist to DB if logged in
    if (user && isSupabaseConfigured()) {
      dbAdd(user.id, item.id, item.quantity).catch((e) => console.error("dbAdd error", e))
    }
  }

  const removeFromCart = (id: number) => {
    setCartItems((prevItems) => prevItems.filter((i) => i.id !== id))
    if (user && isSupabaseConfigured()) {
      dbRemove(user.id, id).catch((e) => console.error("dbRemove error", e))
    }
  }

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setCartItems((prevItems) => prevItems.map((i) => (i.id === id ? { ...i, quantity } : i)))
    if (user && isSupabaseConfigured()) {
      dbUpdate(user.id, id, quantity).catch((e) => console.error("dbUpdate error", e))
    }
  }

  const clearCart = () => {
    setCartItems([])
    if (user && isSupabaseConfigured()) {
      dbClear(user.id).catch((e) => console.error("dbClear error", e))
    }
  }

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
