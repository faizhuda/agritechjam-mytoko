"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import { fetchProductsByIds } from "@/lib/db/products"
import { useAuth } from "@/hooks/use-auth"
import {
  listCartItems as dbList,
  addToCart as dbAdd,
  removeFromCart as dbRemove,
  updateCartItem as dbUpdate,
  clearCart as dbClear,
  getOrCreateCartId,
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

  // Helper: fetch current stock for product ids. Returns map of id -> maxStock (0 if out-of-stock)
  const fetchStockMap = useCallback(async (ids: number[]): Promise<Map<number, number>> => {
    try {
      const prods = await fetchProductsByIds(ids)
      const map = new Map<number, number>()
      for (const p of prods) {
        const max = !p?.inStock ? 0 : Math.max(0, Number(p?.stock ?? 0))
        map.set(p.id, max)
      }
      // For any id not returned, assume 0
      for (const id of ids) if (!map.has(id)) map.set(id, 0)
      return map
    } catch {
      // On failure, assume no additional stock to avoid exceeding
      return new Map(ids.map((id) => [id, 0]))
    }
  }, [])

  // Helper: clamp a set of items to current stock; optionally persist fixes for logged-in users
  const clampItemsToStock = useCallback(async (items: CartItem[]): Promise<CartItem[]> => {
    const ids = Array.from(new Set(items.map((i) => i.id)))
    if (ids.length === 0) return items
    const stockMap = await fetchStockMap(ids)
    const adjusted: CartItem[] = []
    for (const it of items) {
      const max = stockMap.get(it.id) ?? 0
      const qty = Math.min(it.quantity, max)
      if (qty > 0) {
        if (qty !== it.quantity && user && isSupabaseConfigured()) {
          // Persist corrected quantity
          dbUpdate(user.id, it.id, qty).catch(() => {})
        }
        adjusted.push({ ...it, quantity: qty })
      } else {
        if (user && isSupabaseConfigured()) {
          dbRemove(user.id, it.id).catch(() => {})
        }
      }
    }
    return adjusted
  }, [fetchStockMap, user])

  // Push guest cart to DB once upon login
  useEffect(() => {
    const syncGuestToDb = async () => {
      if (!user || !isSupabaseConfigured()) return
      if (syncedOnLogin.current) return
      if (cartItems.length === 0) return
      for (const item of cartItems) {
        await dbAdd(user.id, item.id, item.quantity)
      }
      syncedOnLogin.current = true
    }
    syncGuestToDb()
  }, [user, cartItems])

  // Load from DB when user logs in or changes
  useEffect(() => {
    const load = async () => {
      if (!user || !isSupabaseConfigured()) return
      const rows = await dbList(user.id)
      const raw = rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, quantity: r.quantity, image: r.image }))
      const clamped = await clampItemsToStock(raw)
      setCartItems(clamped)
    }
    load()
  }, [user, clampItemsToStock])

  // Realtime: keep cart in sync when DB changes from other tabs/devices and when products change
  useEffect(() => {
    let mounted = true
    let channels: Array<ReturnType<typeof supabase.channel>> = []
    ;(async () => {
      if (!user || !isSupabaseConfigured()) return
      const cartId = await getOrCreateCartId(user.id)
      if (!mounted || !cartId) return
      const cartCh = supabase
        .channel(`cart-items-${cartId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `cart_id=eq.${cartId}` }, async () => {
          try {
            const rows = await dbList(user.id)
            if (!mounted) return
            const raw = rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, quantity: r.quantity, image: r.image }))
            const clamped = await clampItemsToStock(raw)
            if (!mounted) return
            setCartItems(clamped)
          } catch (e) {
            // ...existing code...
          }
        })
        .subscribe()

      const prodCh = supabase
  .channel(`products-for-cart-${cartId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload: { new: { id?: number }, old: { id?: number } }) => {
    const changedId = Number(payload.new?.id ?? payload.old?.id)
          if (!changedId) return
          setCartItems((prev) => {
            if (!prev.some((i) => i.id === changedId)) return prev
            ;(async () => {
              try {
                const rows = await dbList(user.id)
                if (!mounted) return
                const raw = rows.map((r) => ({ id: r.productId, name: r.name, price: r.price, quantity: r.quantity, image: r.image }))
                const clamped = await clampItemsToStock(raw)
                if (!mounted) return
                setCartItems(clamped)
              } catch {}
            })()
            return prev
          })
        })
        .subscribe()

      channels.push(cartCh, prodCh)
    })()

    return () => {
      mounted = false
      for (const ch of channels) {
        try { ch.unsubscribe() } catch {}
      }
    }
  }, [user, clampItemsToStock])

  // Rehydrate guest cart item details (name/price/image) from DB and clamp to stock
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
        const updated = cartItems.map((i) => {
          const p = byId.get(i.id)
          if (!p) return i
          const max = !p.inStock ? 0 : Math.max(0, Number(p.stock ?? 0))
          const qty = Math.min(i.quantity, max)
          return qty > 0 ? { ...i, name: p.name, price: p.price, image: p.image, quantity: qty } : null
        }).filter(Boolean) as CartItem[]
        setCartItems(updated)
      } catch (e) {
        // ...existing code...
      }
    }
    // Fire-and-forget; doesn't need to block UI
    rehydrate()
  }, [user, cartItems])

  const addToCart = (item: CartItem) => {
    ;(async () => {
      const stockMap = await fetchStockMap([item.id])
      const max = stockMap.get(item.id) ?? 0
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((i) => i.id === item.id)
        const existingQty = existingItem?.quantity ?? 0
        const desired = existingQty + item.quantity
        const finalQty = Math.min(desired, max)
        if (finalQty <= 0) {
          return prevItems
        }
        let next: CartItem[]
        if (existingItem) {
          if (finalQty === existingQty) return prevItems
          next = prevItems.map((i) => (i.id === item.id ? { ...i, quantity: finalQty } : i))
        } else {
          next = [...prevItems, { ...item, quantity: finalQty }]
        }
        // Persist delta to DB if logged in
        if (user && isSupabaseConfigured()) {
          const delta = finalQty - existingQty
          if (delta > 0) dbAdd(user.id, item.id, delta).catch(() => {})
        }
        return next
      })
    })()
  }

  const removeFromCart = (id: number) => {
    setCartItems((prevItems) => prevItems.filter((i) => i.id !== id))
    if (user && isSupabaseConfigured()) {
  dbRemove(user.id, id).catch(() => {})
    }
  }

  const updateQuantity = (id: number, quantity: number) => {
    ;(async () => {
      const stockMap = await fetchStockMap([id])
      const max = stockMap.get(id) ?? 0
      const finalQty = Math.min(Math.max(0, quantity), max)
      if (finalQty <= 0) {
        setCartItems((prevItems) => prevItems.filter((i) => i.id !== id))
        if (user && isSupabaseConfigured()) {
          dbRemove(user.id, id).catch(() => {})
        }
        return
      }
      setCartItems((prevItems) => prevItems.map((i) => (i.id === id ? { ...i, quantity: finalQty } : i)))
      if (user && isSupabaseConfigured()) {
  dbUpdate(user.id, id, finalQty).catch(() => {})
      }
    })()
  }

  const clearCart = () => {
    setCartItems([])
    if (user && isSupabaseConfigured()) {
  dbClear(user.id).catch(() => {})
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
