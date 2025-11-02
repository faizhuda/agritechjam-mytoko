"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

// Minimal placeholder wishlist stored in localStorage per user for now.
// You can replace this with a Supabase table later.

type Wish = { id: string; name: string }

export default function WishlistPage() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState<Wish[]>([])

  useEffect(() => {
    if (!user) return
    try {
      const raw = localStorage.getItem(`wishlist:${user.id}`)
      setItems(raw ? (JSON.parse(raw) as Wish[]) : [])
    } catch {
      setItems([])
    }
  }, [user])

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-bold mb-2">Wishlist</h1>
        <p className="text-gray-600">Please sign in to view your wishlist.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Wishlist</h1>
      {items.length === 0 ? (
        <p className="text-gray-600">Your wishlist is empty.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((w) => (
            <li key={w.id} className="border rounded-md px-3 py-2">{w.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
