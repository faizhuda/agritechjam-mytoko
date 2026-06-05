"use client"

import { useEffect, useMemo, useState } from "react"
import { User, Package, Heart, ShieldCheck } from "lucide-react"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import { formatIDR } from "@/lib/utils"
import Link from "next/link"
import RatingModal, { type RatingData } from "@/components/rating-modal"
import { listWishlist as dbList } from "@/lib/db/wishlist"
import { useToast } from "@/hooks/use-toast"
import { useConfirm } from "@/hooks/use-confirm"

type OrderItem = { productId: number; productName: string; quantity: number; price: number }
type OrderRow = { id: string; orderNumber?: string; date: string; status: string; total: number; items: OrderItem[]; rating?: number; review?: string }

export default function UserDashboard() {
  const { toast } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "orders">("overview")

  const [profile, setProfile] = useState<{ full_name: string; first_name?: string; last_name?: string; phone?: string; address?: string; is_admin?: boolean } | null>(null)
  const [authEmail, setAuthEmail] = useState<string>("")
  const [memberSince, setMemberSince] = useState<string>("")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [wishlistAlerts, setWishlistAlerts] = useState<Array<{ id: number; name: string; image?: string; price: number; stock?: number }>>([])
  const [recommendations, setRecommendations] = useState<Array<{ id: number; name: string; image?: string; price: number; rating?: number; reviews?: number }>>([])
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<{ orderId: string; productId: number; productName: string } | null>(null)
  const [reviewToWrite, setReviewToWrite] = useState<Array<{ orderId: string; productId: number; productName: string }>>([])

  // Untuk header: hanya tampilkan first name
  const firstNameOnly = profile?.first_name && profile?.first_name.trim().length > 0
    ? profile.first_name
    : (profile?.full_name?.split(" ")[0] || authEmail?.split("@")[0] || "User")

  // Profile editing moved to /profile page

  const statusColors: Record<string, string> = {
    completed: "bg-green-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
    pending: "bg-yellow-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
    shipped: "bg-cyan-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
    delivered: "bg-green-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
    paid: "bg-green-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
    cancelled: "bg-red-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5",
  }

  // Function to reload reviews to write (simplified - per product not per order)
  const reloadReviewsToWrite = async () => {
    if (!isSupabaseConfigured()) return
    const { data: auth } = await supabase.auth.getUser()
    const u = auth.user
    if (!u) return

    const { data: ords } = await supabase
      .from("orders")
      .select(`id, status, order_items(product_id, products(name))`)
      .eq('user_id', u.id)
      .order("created_at", { ascending: false })

    const deliveredOrders = (ords || []).filter((o: any) => String(o.status ?? '').toLowerCase() === 'delivered')
    
    // Get unique products from delivered orders
    const productMap = new Map<number, string>()
    for (const o of deliveredOrders) {
      for (const it of o.order_items || []) {
        const productId = Number(it.product_id)
        const productName = it.products?.name ?? `Product #${productId}`
        if (!productMap.has(productId)) {
          productMap.set(productId, productName)
        }
      }
    }

    if (productMap.size > 0) {
      const { data: myReviews } = await supabase
        .from('product_reviews')
        .select('product_id')
        .eq('user_id', u.id)

      const reviewedProductIds = new Set((myReviews || []).map((r: any) => Number(r.product_id)))
      
      const toReview = Array.from(productMap.entries())
        .filter(([productId]) => !reviewedProductIds.has(productId))
        .slice(0, 3)
        .map(([productId, productName]) => ({
          orderId: '',
          productId,
          productName,
        }))
      
      setReviewToWrite(toReview)
    } else {
      setReviewToWrite([])
    }
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
        .eq('user_id', u.id)
        .order("created_at", { ascending: false })
      
      console.log('📥 Raw orders from DB:', ords?.slice(0, 3).map((o: any) => ({
        id: o.id,
        id_type: typeof o.id,
        id_length: String(o.id).length,
        order_number: o.order_number,
        status: o.status
      })))
      
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

      // Compute "reviews to write": delivered products that haven't been reviewed yet
      // Simple: One review per user per product (no order dependency)
      try {
        const deliveredOrders = (ords || []).filter((o: any) => String(o.status ?? '').toLowerCase() === 'delivered')
        
        // Get unique products from delivered orders
        const productMap = new Map<number, string>()
        for (const o of deliveredOrders) {
          for (const it of o.order_items || []) {
            const productId = Number(it.product_id)
            const productName = it.products?.name ?? `Product #${productId}`
            if (!productMap.has(productId)) {
              productMap.set(productId, productName)
            }
          }
        }
        
        console.log('� Unique products from delivered orders:', Array.from(productMap.entries()))
        
        if (productMap.size > 0) {
          // Fetch all reviews this user has written (just product_id)
          const { data: myReviews } = await supabase
            .from('product_reviews')
            .select('product_id')
            .eq('user_id', u.id)
          
          console.log('✅ User reviews:', myReviews?.length || 0, myReviews)
          
          // Create a Set of reviewed product IDs
          const reviewedProductIds = new Set(
            (myReviews || []).map((r: any) => Number(r.product_id))
          )
          
          console.log('🔑 Reviewed products:', Array.from(reviewedProductIds))
          
          // Filter out products that have already been reviewed
          const toReview = Array.from(productMap.entries())
            .filter(([productId]) => !reviewedProductIds.has(productId))
            .slice(0, 3)
            .map(([productId, productName]) => ({
              orderId: '', // Not needed anymore
              productId,
              productName,
            }))
          
          console.log('⭐ Products to review:', toReview.length, toReview)
          
          setReviewToWrite(toReview)
        } else {
          setReviewToWrite([])
        }
      } catch (err) {
        console.error('Error loading reviews to write:', err)
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-black uppercase tracking-tight">Hello, {firstNameOnly}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap md:flex-nowrap">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 border-2 border-black rounded-none font-black uppercase transition-all ${
              activeTab === "overview"
                ? "bg-yellow-200 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]"
                : "bg-white text-black hover:bg-stone-50 hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-3 border-2 border-black rounded-none font-black uppercase transition-all ${
              activeTab === "orders"
                ? "bg-yellow-200 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]"
                : "bg-white text-black hover:bg-stone-50 hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
              <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-20 h-20 bg-blue-300 border-2 border-black rounded-none flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <User size={36} className="text-black stroke-[2.5]" />
                  </div>
                  <h2 className="mt-4 font-black text-lg text-black wrap-break-word uppercase tracking-tight">{profile?.full_name ?? authEmail}</h2>
                  <p className="text-sm text-black font-bold break-all mt-1">{authEmail}</p>
                  <p className="text-xs text-black font-black uppercase mt-3 bg-stone-100 border border-black px-2 py-1">Member since {memberSince}</p>
                </div>
                <Link
                  href="/profile"
                  className="mt-4 w-full py-2 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all block text-center"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/wishlist"
                  className="mt-3 w-full py-2 bg-pink-200 text-black border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Heart size={16} className="stroke-[2.5]" /> Wishlist
                </Link>
                {profile?.is_admin ? (
                  <Link
                    href="/admin"
                    className="mt-3 w-full py-2 bg-green-200 text-black border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2"
                    title="Admin Panel"
                  >
                    <ShieldCheck size={16} className="stroke-[2.5]" /> Admin Panel
                  </Link>
                ) : null}
              </div>

              {/* Overview actionable cards (span remaining columns) */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Orders */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wider">Active Orders</h3>
                    <Package size={20} className="text-black stroke-[2.5]" />
                  </div>
                  {activeOrders.length === 0 ? (
                    <p className="text-sm text-black font-bold">No active orders. </p>
                  ) : (
                    <div className="space-y-3">
                      {activeOrders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between border-b border-stone-200 pb-2 last:border-b-0 last:pb-0">
                          <div>
                            <p className="font-black text-black text-sm">{o.orderNumber ?? o.id}</p>
                            <p className="text-xs text-black font-bold uppercase mt-0.5">{o.status}</p>
                          </div>
                          <Link
                            href={`/invoice?orderId=${o.id}`}
                            className="px-3 py-1 bg-cyan-200 border-2 border-black text-black text-xs font-black uppercase hover:bg-cyan-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            title="Track order"
                          >
                            Track
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews to write */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wider">Reviews to write</h3>
                  </div>
                  {reviewToWrite.length === 0 ? (
                    <p className="text-sm text-black font-bold">No pending reviews.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviewToWrite.map((it, idx) => (
                        <div key={`${it.orderId}-${idx}`} className="flex items-center justify-between border-b border-stone-200 pb-2 last:border-b-0 last:pb-0">
                          <span className="text-sm text-black font-bold truncate mr-3">{it.productName}</span>
                          <button
                            onClick={async () => {
                              console.log('🎯 Clicked Rate now for:', {
                                productId: it.productId,
                                productName: it.productName
                              })
                              
                              // Check if already reviewed (simple: just check product_id)
                              const { data: auth } = await supabase.auth.getUser()
                              if (!auth.user) return
                              
                              const { data: existing } = await supabase
                                .from('product_reviews')
                                .select('id')
                                .eq('user_id', auth.user.id)
                                .eq('product_id', it.productId)
                                .maybeSingle()
                              
                              if (existing) {
                                // Remove from UI immediately
                                setReviewToWrite((prev) => 
                                  prev.filter((x) => Number(x.productId) !== Number(it.productId))
                                )
                                
                                toast({
                                  title: 'Already Reviewed',
                                  description: 'This product has been removed from your review list.',
                                  variant: 'default'
                                })
                                return
                              }
                              
                              setRatingTarget({ orderId: '', productId: it.productId, productName: it.productName })
                              setRatingOpen(true)
                            }}
                            className="px-3 py-1 bg-yellow-200 border-2 border-black text-black text-xs font-black uppercase hover:bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                          >
                            Rate now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wishlist alerts */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wider">Wishlist alerts</h3>
                  </div>
                  {wishlistAlerts.length === 0 ? (
                    <p className="text-sm text-black font-bold">No in-stock alerts from your wishlist.</p>
                  ) : (
                    <div className="space-y-3">
                      {wishlistAlerts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border-b border-stone-200 pb-2 last:border-b-0 last:pb-0">
                          <span className="text-sm text-black font-bold truncate mr-3">{p.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-black bg-yellow-200 border border-black px-1.5 py-0.5">{formatIDR(p.price)}</span>
                            <Link
                              href={`/product/${p.id}`}
                              className="px-3 py-1 bg-green-200 border-2 border-black text-black text-xs font-black uppercase hover:bg-green-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended for you */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wider">Recommended for you</h3>
                  </div>
                  {recommendations.length === 0 ? (
                    <p className="text-sm text-black font-bold">Add some items to your wishlist or place an order to get personalized picks.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recommendations.slice(0, 4).map((p) => (
                        <Link key={p.id} href={`/product/${p.id}`} className="border-2 border-black rounded-none p-3 bg-white hover:bg-stone-50 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] block">
                          <p className="text-xs font-black text-black truncate uppercase tracking-tight">{p.name}</p>
                          <p className="text-xs font-black text-blue-600 mt-1">{formatIDR(p.price)}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile completion */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                    <h3 className="font-black text-black text-sm uppercase tracking-wider">Profile completion</h3>
                  </div>
                  <div className="w-full bg-stone-100 border-2 border-black rounded-none h-4 mb-3 overflow-hidden">
                    <div className="bg-blue-300 h-full border-r-2 border-black transition-all" style={{ width: `${profileCompleted || 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black font-black uppercase">{profileCompleted || 0}% complete</span>
                    <Link
                      href="/profile"
                      className="px-3 py-1 bg-blue-300 border-2 border-black text-black text-xs font-black uppercase hover:bg-blue-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      Complete
                    </Link>
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
            <h2 className="text-2xl font-black text-black mb-6 uppercase tracking-tight">Order History</h2>
            <div className="space-y-6">
              {orders.map((order: OrderRow) => (
                <div
                  key={order.id}
                  className="border-4 border-black rounded-none p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-black text-black text-base truncate uppercase tracking-tight">{order.orderNumber ?? order.id}</h3>
                        <p className="text-xs text-stone-600 font-bold mt-1">{new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                      </div>
                      <span className={statusColors[(order.status || "").toLowerCase()] || "bg-stone-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5"}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-stone-200 pt-3 mt-3">
                      <p className="text-xs text-stone-600 font-bold uppercase">Total</p>
                      <p className="font-black text-black text-lg">{formatIDR(order.total)}</p>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <h3 className="font-black text-black text-lg uppercase tracking-tight">{order.orderNumber ?? order.id}</h3>
                      <p className="text-xs text-stone-600 font-bold mt-1">{new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right w-[150px]">
                        <p className="text-xs text-stone-600 font-bold uppercase">Total</p>
                        <p className="font-black text-black text-lg mt-0.5">{formatIDR(order.total)}</p>
                      </div>
                      <span className={statusColors[(order.status || "").toLowerCase()] || "bg-stone-200 text-black border-2 border-black font-black uppercase text-xs rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5"}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full text-center py-2.5 px-3 border-2 border-black bg-stone-50 hover:bg-stone-100 rounded-none text-black font-black uppercase tracking-wide transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    {expandedOrder === order.id ? "Hide Details" : "View Details"}
                  </button>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t-4 border-black">
                      <div className="space-y-3 mb-6">
                        {order.items.map((item: OrderItem, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-black font-bold text-sm">
                            <span>
                              {item.productName} <span className="font-black">x{item.quantity}</span>
                            </span>
                            <div className="flex items-center gap-3 min-w-[200px] justify-end">
                              {/* Only show Rate button for delivered orders */}
                              {order.status.toLowerCase() === 'delivered' && (
                                <button
                                  onClick={() => {
                                    console.log('🎯 Opening rating modal for:', {
                                      productId: item.productId,
                                      productName: item.productName,
                                      status: order.status
                                    })
                                    setRatingTarget({ orderId: '', productId: item.productId, productName: item.productName })
                                    setRatingOpen(true)
                                  }}
                                  className="px-3 py-1 bg-yellow-200 border-2 border-black text-black text-xs font-black uppercase hover:bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                                >
                                  Rate
                                </button>
                              )}
                              <span className="w-[120px] text-right font-black">{formatIDR(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.rating && (
                        <div className="bg-cyan-100 p-4 rounded-none mb-6 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <p className="font-black text-black text-xs uppercase tracking-wide mb-1">Your Rating</p>
                          <div className="flex gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={i < order.rating! ? "text-amber-400 text-xl" : "text-stone-300 text-xl"}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          {order.review && <p className="text-sm text-black font-bold">{order.review}</p>}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Link
                          href={`/invoice?orderId=${order.id}`}
                          className={`py-2 bg-blue-300 border-2 border-black text-black rounded-none font-black text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase text-sm ${
                            order.status.toLowerCase() === 'pending' ? 'flex-1' : 'w-full'
                          }`}
                        >
                          View Invoice
                        </Link>
                        
                        {/* Only allow cancellation for pending orders (not paid) */}
                        {order.status.toLowerCase() === 'pending' && (
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'Cancel Order',
                                description: `Are you sure you want to cancel order ${order.orderNumber || order.id}? Stock will be returned to inventory.`,
                                confirmText: 'Yes, Cancel Order',
                                cancelText: 'No, Keep Order',
                                variant: 'destructive'
                              })
                              
                              if (!confirmed) return
                              
                              try {
                                const { data: sessionData } = await supabase.auth.getSession()
                                const token = sessionData?.session?.access_token
                                const resp = await fetch(`/api/orders/${order.id}/cancel`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                })
                                if (!resp.ok) throw new Error('Failed to cancel order')
                                
                                toast({ 
                                  title: 'Order Cancelled', 
                                  description: 'Your order has been cancelled and stock has been returned.' 
                                })
                                
                                // Update order status locally tanpa reload
                                setOrders(prevOrders => 
                                  prevOrders.map(o => 
                                    o.id === order.id ? { ...o, status: 'cancelled' } : o
                                  )
                                )
                              } catch (err: any) {
                                toast({ 
                                  title: 'Error', 
                                  description: err.message || 'Failed to cancel order', 
                                  variant: 'destructive' 
                                })
                              }
                            }}
                            className="flex-1 py-2 bg-red-200 border-2 border-black text-black rounded-none font-black text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all uppercase text-sm"
                          >
                            Cancel Order
                          </button>
                        )}
                        
                        {/* Shipped/Delivered status: use individual Rate buttons per product */}
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
            if (!ratingTarget) {
              toast({
                title: "Error",
                description: "No product selected for review.",
                variant: "destructive",
              })
              return
            }
            
            if (!isSupabaseConfigured()) {
              toast({
                title: "Error",
                description: "Database not configured.",
                variant: "destructive",
              })
              setRatingOpen(false)
              return
            }
            
            const { data: auth, error: authError } = await supabase.auth.getUser()
            const uid = auth.user?.id
            
            console.log('🔐 Auth check:', { 
              user: auth.user, 
              uid, 
              authError,
              hasSession: !!auth.user 
            })
            
            if (!uid) {
              toast({
                title: "Authentication Required",
                description: "Please log in to submit a review.",
                variant: "destructive",
              })
              setRatingOpen(false)
              return
            }

            // Insert into product_reviews table (one review per user per product)
            const payload = {
              user_id: uid,
              product_id: Number(ratingTarget.productId),
              rating: Number(r.productRating),
              comment: r.comment || null,
            }

            console.log('📝 Submitting review:', payload)

            const { error } = await supabase
              .from("product_reviews")
              .insert(payload)
            
            if (error) {
              console.error('Review submission error:', error)
              const msg = String(error.message || "Failed to submit review")
              
              // Unique violation (one review per user per product)
              if ((error as any).code === "23505" || /unique/i.test(msg)) {
                toast({
                  title: "Already Reviewed",
                  description: "You have already reviewed this product.",
                  variant: "destructive",
                })
              } else if (/violates row-level security|RLS/i.test(msg) || /not authorized/i.test(msg)) {
                toast({
                  title: "Not Authorized",
                  description: "You need to be logged in to submit a review.",
                  variant: "destructive",
                })
              } else if (/product_reviews_rating_check/i.test(msg) || /violates check constraint/i.test(msg)) {
                toast({
                  title: "Invalid Rating",
                  description: "Your rating must be between 1 and 5 stars.",
                  variant: "destructive",
                })
              } else {
                toast({
                  title: "Review Submission Failed",
                  description: "Something went wrong. Please try again or contact support if the problem persists.",
                  variant: "destructive",
                })
              }
              setRatingOpen(false)
              return
            }
            
            // Success!
            toast({
              title: "Review Submitted!",
              description: `Thank you for reviewing ${ratingTarget.productName}`,
            })
            setRatingOpen(false)
            
            // Reload reviews to write list to update UI
            await reloadReviewsToWrite()
          } catch (e) {
            console.error("submit review failed", e)
            toast({
              title: "Unexpected Error",
              description: e instanceof Error ? e.message : "Failed to submit review",
              variant: "destructive",
            })
            setRatingOpen(false)
          }
        }}
      />
      {ConfirmDialog}
    </div>
  )
}
