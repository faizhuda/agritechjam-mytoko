"use client"

import { useEffect, useMemo, useState } from "react"
import { User, Menu, X, Package, Heart, ShieldCheck } from "lucide-react"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import { formatIDR } from "@/lib/utils"
import Link from "next/link"
import RatingModal, { type RatingData } from "@/components/rating-modal"
import { listWishlist as dbList } from "@/lib/db/wishlist"

type OrderItem = { productId: number; productName: string; quantity: number; price: number }
type OrderRow = { id: string; orderNumber?: string; date: string; status: string; total: number; items: OrderItem[]; rating?: number; review?: string }

export default function UserDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "orders">("overview")

  const [profile, setProfile] = useState<{ full_name: string; phone?: string; address?: string; is_admin?: boolean } | null>(null)
  const [authEmail, setAuthEmail] = useState<string>("")
  const [memberSince, setMemberSince] = useState<string>("")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [wishlistAlerts, setWishlistAlerts] = useState<Array<{ id: number; name: string; image?: string; price: number; stock?: number }>>([])
  const [recommendations, setRecommendations] = useState<Array<{ id: number; name: string; image?: string; price: number; rating?: number; reviews?: number }>>([])
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<{ orderId: string; productId: number; productName: string } | null>(null)
  const [reviewToWrite, setReviewToWrite] = useState<Array<{ orderId: string; productId: number; productName: string }>>([])

  const firstName = ((profile as any)?.first_name as string) || (profile?.full_name || "").trim().split(" ")[0] || (authEmail?.split("@")[0] ?? "User")

  // Profile editing moved to /profile page

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
  }

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) return
      const { data: auth } = await supabase.auth.getUser()
      const u = auth.user
      if (!u) return
      setAuthEmail(u.email ?? "")
      try {
        setMemberSince(
          u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : ""
        )
      } catch {}
      const { data: prof } = await supabase.from("profiles").select("full_name, first_name, last_name, phone, address, city, zip_code, is_admin").eq("id", u.id).maybeSingle()
      setProfile(prof as any)
      const { data: ords, error } = await supabase
        .from("orders")
        .select(`id, order_number, created_at, status, total,
                 order_items(quantity, price, product_id, products(name, category))`)
        .order("created_at", { ascending: false })
      if (!error) {
        const mapped: OrderRow[] = (ords || []).map((o: any) => {
          const items: OrderItem[] = (o.order_items || []).map((it: any) => ({
            productId: Number(it.product_id),
            productName: it.products?.name ?? `Product #${it.product_id}`,
            quantity: Number(it.quantity ?? 0),
            price: Number(it.price ?? 0),
          }))
          return {
            id: String(o.id),
            orderNumber: o.order_number ? String(o.order_number) : undefined,
            date: o.created_at,
            status: String(o.status ?? "pending"),
            total: Number(o.total ?? items.reduce((s: number, x: OrderItem) => s + x.price * x.quantity, 0)),
            items,
          }
        })
        setOrders(mapped)

        // Build recommendations from most-purchased categories
        try {
          const catCount: Record<string, number> = {}
          for (const o of ords || []) {
            for (const it of o.order_items || []) {
              const cat = it.products?.category
              if (cat) catCount[cat] = (catCount[cat] || 0) + 1
            }
          }
          const topCats = Object.entries(catCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([c]) => c)
          if (topCats.length) {
            const { data: recs } = await supabase
              .from("products")
              .select("id, name, price, image, rating, reviews, category")
              .in("category", topCats)
              .order("rating", { ascending: false })
              .limit(8)
            setRecommendations(
              (recs || []).map((p: any) => ({
                id: Number(p.id),
                name: p.name,
                price: Number(p.price ?? 0),
                image: p.image ?? undefined,
                rating: Number(p.rating ?? 0),
                reviews: Number(p.reviews ?? 0),
              }))
            )
          }
        } catch {}
  }

      // Wishlist alerts: fetch items and show those in stock (low stock first)
      try {
        const wishRows = await dbList(u.id)
        const ids = wishRows.map((w) => w.productId)
        if (ids.length) {
          const { data: prods } = await supabase
            .from("products")
            .select("id, name, price, image, stock, in_stock")
            .in("id", ids)
          const alerts = (prods || [])
            .filter((p: any) => Boolean(p.in_stock))
            .sort((a: any, b: any) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
            .slice(0, 3)
            .map((p: any) => ({ id: Number(p.id), name: p.name, price: Number(p.price ?? 0), image: p.image ?? undefined, stock: Number(p.stock ?? 0) }))
          setWishlistAlerts(alerts)
        } else {
          setWishlistAlerts([])
        }
      } catch {
        setWishlistAlerts([])
      }

      // Compute "reviews to write": delivered order items without a review from this user
      try {
        const deliveredOrders = (ords || []).filter((o: any) => String(o.status ?? '').toLowerCase() === 'delivered')
        const sixtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 60
        const items = deliveredOrders
          .filter((o: any) => new Date(o.created_at).getTime() >= sixtyDaysAgo)
          .flatMap((o: any) =>
            (o.order_items || []).map((it: any) => ({
              orderId: String(o.id),
              productId: Number(it.product_id),
              productName: it.products?.name ?? `Product #${it.product_id}`,
            }))
          )
        const productIds = Array.from(new Set(items.map((x: any) => x.productId)))
        if (productIds.length) {
          const { data: myReviews } = await supabase
            .from('reviews')
            .select('product_id')
            .eq('user_id', u.id)
            .in('product_id', productIds)
          const reviewed = new Set((myReviews || []).map((r: any) => Number(r.product_id)))
          const filtered = items.filter((it: any) => !reviewed.has(it.productId)).slice(0, 3)
          setReviewToWrite(filtered)
        } else {
          setReviewToWrite([])
        }
      } catch {
        setReviewToWrite([])
      }
    }
    load()
  }, [])

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes((o.status || "").toLowerCase())).slice(0, 2)
  // Review candidates computed asynchronously with user-specific filter

  const profileCompleted = (() => {
    const p = profile as any
    const fields = [p?.first_name, p?.last_name, p?.phone, p?.address, p?.city, p?.zip_code]
    const filled = fields.filter((x) => Boolean((x ?? "").toString().trim())).length
    return Math.round((filled / fields.length) * 100)
  })()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold text-black">Hello, {firstName}</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-black">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap md:flex-nowrap">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === "overview" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            Order History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
              {/* User Info Card */}
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={36} className="text-white" />
                  </div>
                  <h2 className="mt-3 font-bold text-lg text-black break-words">{profile?.full_name ?? authEmail}</h2>
                  <p className="text-sm text-black font-semibold break-all">{authEmail}</p>
                </div>
                <p className="text-sm text-black font-semibold">Member since {memberSince}</p>
                <Link
                  href="/profile"
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition block text-center"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/wishlist"
                  className="mt-3 w-full py-2 border-2 border-pink-500 text-pink-600 rounded-lg font-bold hover:bg-pink-50 transition block text-center flex items-center justify-center gap-2"
                >
                  <Heart size={16} /> Wishlist
                </Link>
                {profile?.is_admin ? (
                  <Link
                    href="/admin"
                    className="mt-3 w-full py-2 border-2 border-green-600 text-green-700 rounded-lg font-bold hover:bg-green-50 transition block text-center flex items-center justify-center gap-2"
                    title="Admin Panel"
                  >
                    <ShieldCheck size={16} /> Admin Panel
                  </Link>
                ) : null}
              </div>

              {/* Overview actionable cards (span remaining columns) */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Orders */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-black text-sm">Active Orders</h3>
                    <Package size={20} className="text-orange-600" />
                  </div>
                  {activeOrders.length === 0 ? (
                    <p className="text-sm text-black font-semibold">No active orders. </p>
                  ) : (
                    <div className="space-y-3">
                      {activeOrders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-black text-sm">{o.orderNumber ?? o.id}</p>
                            <p className="text-xs text-black font-semibold capitalize">{o.status}</p>
                          </div>
                          <Link href="/dashboard" className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Track</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews to write */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-black text-sm">Reviews to write</h3>
                  </div>
                  {reviewToWrite.length === 0 ? (
                    <p className="text-sm text-black font-semibold">No pending reviews.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviewToWrite.map((it, idx) => (
                        <div key={`${it.orderId}-${idx}`} className="flex items-center justify-between">
                          <span className="text-sm text-black font-semibold truncate mr-3">{it.productName}</span>
                          <button
                            onClick={() => {
                              setRatingTarget({ orderId: it.orderId, productId: it.productId, productName: it.productName })
                              setRatingOpen(true)
                            }}
                            className="px-3 py-1 border-2 border-yellow-600 text-yellow-700 rounded-lg text-sm font-bold hover:bg-yellow-50"
                          >
                            Rate now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wishlist alerts */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-black text-sm">Wishlist alerts</h3>
                  </div>
                  {wishlistAlerts.length === 0 ? (
                    <p className="text-sm text-black font-semibold">No in-stock alerts from your wishlist.</p>
                  ) : (
                    <div className="space-y-3">
                      {wishlistAlerts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-sm text-black font-semibold truncate mr-3">{p.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-blue-600">{formatIDR(p.price)}</span>
                            <Link href={`/product/${p.id}`} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">View</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended for you */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-black text-sm">Recommended for you</h3>
                  </div>
                  {recommendations.length === 0 ? (
                    <p className="text-sm text-black font-semibold">Add some items to your wishlist or place an order to get personalized picks.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recommendations.slice(0, 4).map((p) => (
                        <Link key={p.id} href={`/product/${p.id}`} className="border-2 border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                          <p className="text-sm font-bold text-black truncate">{p.name}</p>
                          <p className="text-sm font-bold text-blue-600">{formatIDR(p.price)}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile completion */}
                <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-black text-sm">Profile completion</h3>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${profileCompleted || 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black font-semibold">{profileCompleted || 0}% complete</span>
                    <Link href="/profile" className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Complete</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links removed as requested */}
          </div>
        )}

        {/* Profile Settings tab removed */}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-2xl font-bold text-black mb-6">Order History</h2>
            <div className="space-y-4">
              {orders.map((order: OrderRow) => (
                <div
                  key={order.id}
                  className="border-2 border-gray-300 rounded-lg p-4 hover:shadow-md transition bg-white"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-black text-lg">{order.orderNumber ?? order.id}</h3>
                      <p className="text-sm text-black font-semibold">{new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-black font-semibold">Total</p>
                        <p className="font-bold text-black text-lg">{formatIDR(order.total)}</p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full font-bold text-sm capitalize ${
                          statusColors[(order.status || "").toLowerCase()] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full text-left py-2 px-3 bg-gray-50 rounded-lg text-blue-600 hover:bg-gray-100 font-bold transition"
                  >
                    {expandedOrder === order.id ? "Hide Details" : "View Details"}
                  </button>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-300">
                      <div className="space-y-3 mb-4">
                        {order.items.map((item: OrderItem, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-black font-semibold">
                            <span>
                              {item.productName} x{item.quantity}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setRatingTarget({ orderId: order.id, productId: item.productId, productName: item.productName })
                                  setRatingOpen(true)
                                }}
                                className="px-3 py-1 border-2 border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 font-bold text-sm"
                              >
                                Rate
                              </button>
                              <span>{formatIDR(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.rating && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-4 border-2 border-blue-200">
                          <p className="font-bold text-black text-sm mb-1">Your Rating</p>
                          <div className="flex gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={i < order.rating! ? "text-yellow-400 text-lg" : "text-gray-300 text-lg"}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          {order.review && <p className="text-sm text-black font-semibold">{order.review}</p>}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Link
                          href={`/invoice?orderId=${order.id}`}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition text-center"
                        >
                          View Invoice
                        </Link>
                        <button
                          onClick={() => {
                            const first = order.items[0]
                            if (!first) return
                            setRatingTarget({ orderId: order.id, productId: first.productId, productName: first.productName })
                            setRatingOpen(true)
                          }}
                          className="flex-1 py-2 border-2 border-yellow-600 text-yellow-700 rounded-lg font-bold hover:bg-yellow-50 transition"
                        >
                          Rate Product
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingOpen}
        onClose={() => setRatingOpen(false)}
        orderNumber={ratingTarget ? ratingTarget.productName : undefined}
        onSubmit={async (r: RatingData) => {
          try {
            if (!ratingTarget) return
            if (!isSupabaseConfigured()) return setRatingOpen(false)
            const { data: auth } = await supabase.auth.getUser()
            const uid = auth.user?.id
            if (!uid) return setRatingOpen(false)
            // Load profile for author name
            const { data: prof } = await supabase
              .from("profiles")
              .select("first_name, last_name, full_name")
              .eq("id", uid)
              .maybeSingle()
            const first = (prof as any)?.first_name || ((prof as any)?.full_name ? String((prof as any).full_name).split(" ")[0] : "")
            const last = (prof as any)?.last_name || ((prof as any)?.full_name ? String((prof as any).full_name).split(" ").slice(1).join(" ") : "")
            const author = `${first} ${last}`.trim() || "Customer"

            await supabase
              .from("reviews")
              .insert({
                user_id: uid,
                product_id: ratingTarget.productId,
                author,
                rating: r.productRating,
                title: null,
                comment: r.comment || null,
              })
            // Optimistically remove from pending reviews
            setReviewToWrite((prev) => prev.filter((x) => x.productId !== ratingTarget.productId))
            setRatingOpen(false)
          } catch (e) {
            console.error("submit review failed", e)
            setRatingOpen(false)
          }
        }}
      />
    </div>
  )
}
