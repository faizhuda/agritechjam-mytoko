# Review System Fix - Summary

## Problem Yang Ditemukan

Sistem review rusak karena:

1. **Dashboard page** menggunakan table `reviews` (yang salah)
   - Harusnya pakai `order_reviews` table
   - Logic hanya check `product_id`, padahal harusnya check `(order_id, product_id)` pair
   
2. **Product page** juga fetch dari table `reviews` (yang salah)
   - Harusnya pakai `order_reviews` table
   
3. **Submit review** juga insert ke table `reviews` (yang salah)
   - Harusnya insert ke `order_reviews` table

## Fixes Yang Sudah Dibuat

### 1. `lib/db/products.ts` - fetchReviewsByProductId()
**Before:** Query dari table `reviews`
```typescript
const { data, error } = await supabase
  .from("reviews")
  .select("id, product_id, author, rating, title, comment, created_at, helpful")
```

**After:** Query dari table `order_reviews` dengan join ke `profiles`
```typescript
const { data, error } = await supabase
  .from("order_reviews")
  .select(`
    id,
    product_id,
    user_id,
    rating,
    comment,
    created_at,
    helpful,
    profiles!inner(full_name)
  `)
```

### 2. `app/dashboard/page.tsx` - Load Reviews To Write
**Before:** Check by `product_id` only dari table `reviews`
```typescript
const { data: myReviews } = await supabase
  .from('reviews')
  .select('product_id')
  .eq('user_id', u.id)
const reviewed = new Set((myReviews || []).map((r: any) => Number(r.product_id)))
const filtered = items.filter((it: any) => !reviewed.has(it.productId))
```

**After:** Check by `(order_id, product_id)` pair dari table `order_reviews`
```typescript
const { data: myReviews } = await supabase
  .from('order_reviews')
  .select('order_id, product_id')
  .eq('user_id', u.id)

const reviewedSet = new Set(
  (myReviews || []).map((r: any) => `${String(r.order_id)}|${Number(r.product_id)}`)
)

const filtered = items
  .filter((it: any) => !reviewedSet.has(`${it.orderId}|${it.productId}`))
```

### 3. `app/dashboard/page.tsx` - Submit Review
**Before:** Insert ke table `reviews` tanpa `order_id`
```typescript
const { error } = await supabase
  .from("reviews")
  .insert({
    user_id: uid,
    product_id: ratingTarget.productId,
    author,
    rating: r.productRating,
    comment: r.comment || null,
  })
```

**After:** Insert ke table `order_reviews` dengan `order_id`
```typescript
const payload = {
  user_id: uid,
  order_id: String(ratingTarget.orderId), // UUID string
  product_id: Number(ratingTarget.productId),
  rating: Number(r.productRating),
  comment: r.comment || null,
}

const { error } = await supabase
  .from("order_reviews")
  .insert(payload)
```

### 4. `app/product/[id]/page.tsx` - Auto-refresh Reviews
Added realtime subscription untuk auto-update reviews ketika ada perubahan:
```typescript
useEffect(() => {
  if (!isSupabaseConfigured()) return
  
  const channel = supabase
    .channel(`product-${productId}-reviews`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'order_reviews',
        filter: `product_id=eq.${productId}`
      },
      () => {
        fetchReviewsByProductId(productId).then(setReviews)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [productId])
```

## Hasil Fix

Sekarang sistem review bekerja dengan benar:

✅ **User bisa review product yang sama berkali-kali** (kalau dari order yang berbeda)
✅ **User hanya bisa review SEKALI per product per order** (enforced by unique constraint)
✅ **"Reviews to write" menampilkan list yang benar** (hanya product yang belum di-review untuk order tersebut)
✅ **Product page menampilkan semua reviews dari order_reviews** (bukan table reviews yang lama)
✅ **Auto-refresh** ketika ada review baru di product page

## Database Schema Reference

Table `order_reviews` structure:
```sql
CREATE TABLE public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id bigint NOT NULL REFERENCES products(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (order_id, product_id, user_id)
);
```

Key points:
- `order_id` adalah UUID (string)
- `product_id` adalah bigint (number)
- Unique constraint di `(order_id, product_id, user_id)` - artinya satu user hanya bisa review satu product dari satu order SEKALI
- Kalau user order product yang sama di order lain, dia bisa review lagi

## Testing

Untuk test:
1. Order product A (status delivered)
2. Review product A di dashboard → harus berhasil
3. Coba review product A lagi untuk order yang sama → harus error "already reviewed"
4. Order product A lagi (order baru)
5. Review product A lagi untuk order baru → harus berhasil
6. Check product page → harus muncul 2 reviews untuk product A
