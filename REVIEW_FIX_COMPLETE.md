# Review System Fix - Complete Guide

## Problem Summary
User wanted review system where:
- Users can review products ONLY from delivered orders
- One review per product per order (if they order same product twice, they can review it twice)
- Old system was broken: showed wrong items, used wrong table, had poor error messages

## Changes Made

### 1. Database Query Fixes

#### File: `lib/db/products.ts`
**Changed:** `fetchReviewsByProductId()` function
- **Before:** Queried from `reviews` table (wrong table)
- **After:** Queries from `order_reviews` table (correct)
- Also joins with `profiles` table to get reviewer names

```typescript
// NEW CODE
export async function fetchReviewsByProductId(productId: number) {
  const { data } = await supabase
    .from("order_reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      user_id,
      profiles!inner(full_name)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  return (data || []).map((r: any) => ({
    id: String(r.id),
    rating: Number(r.rating || 0),
    comment: r.comment || "",
    userName: r.profiles?.full_name || "Anonymous",
    createdAt: r.created_at || new Date().toISOString(),
  }))
}
```

### 2. Dashboard Review Logic Fixes

#### File: `app/dashboard/page.tsx`

**Changed:** Review loading logic (lines ~140-177)
- **Before:** Only checked if product was reviewed (ignoring order_id)
- **After:** Checks (order_id, product_id) pairs as unique keys

```typescript
// NEW LOGIC
const deliveredOrders = orders.filter(o => o.status === 'delivered')
const items = deliveredOrders.flatMap(o =>
  o.order_items.map(it => ({
    orderId: o.id,
    productId: it.product_id,
    productName: it.products.name,
  }))
)

// Fetch reviews with BOTH order_id and product_id
const { data: myReviews } = await supabase
  .from('order_reviews')
  .select('order_id, product_id')
  .eq('user_id', userId)

// Create set of reviewed items (order_id|product_id pairs)
const reviewedSet = new Set(
  myReviews.map(r => `${r.order_id}|${r.product_id}`)
)

// Filter out already-reviewed items
const toReview = items.filter(it => 
  !reviewedSet.has(`${it.orderId}|${it.productId}`)
)
```

**Changed:** Review submission (lines ~491-591)
- **Before:** Used `alert()` for errors (ugly browser popup)
- **After:** Uses `toast()` for better UX
- Added detailed logging to debug RLS issues
- Inserts into `order_reviews` with proper payload

```typescript
// NEW SUBMISSION CODE
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

if (error) {
  // Smart error handling with toast
  if (error.code === "23505" || /unique/i.test(error.message)) {
    toast({
      title: "Already Reviewed",
      description: "You have already reviewed this product for this order.",
      variant: "destructive",
    })
  } else if (/RLS|not authorized/i.test(error.message)) {
    toast({
      title: "Not Authorized",
      description: "You can only review products from delivered orders.",
      variant: "destructive",
    })
  } else {
    toast({
      title: "Submission Failed",
      description: error.message,
      variant: "destructive",
    })
  }
} else {
  // Success!
  toast({
    title: "Review Submitted!",
    description: `Thank you for reviewing ${productName}`,
  })
}
```

### 3. Rating Modal Simplification

#### File: `components/rating-modal.tsx`

**Changed:** Removed unused rating fields
- **Before:** Had 3 rating types (product, service, delivery)
- **After:** Only 1 rating type (product) - matches database schema
- **Reason:** `order_reviews` table only has 1 `rating` column

**RatingData interface:**
```typescript
// BEFORE
export interface RatingData {
  productRating: number
  serviceRating: number
  deliveryRating: number
  comment: string
}

// AFTER
export interface RatingData {
  productRating: number
  comment: string
}
```

Removed UI sections for service and delivery ratings, simplified form state.

### 4. Product Page Realtime Updates

#### File: `app/product/[id]/page.tsx`

**Added:** Realtime subscription to auto-refresh reviews
```typescript
const channel = supabase
  .channel('product-reviews')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'order_reviews',
      filter: `product_id=eq.${productId}`,
    },
    () => {
      // Refetch reviews when someone adds/updates/deletes a review
      fetchReviewsByProductId(productId).then(setReviews)
    }
  )
  .subscribe()
```

### 5. Documentation

#### Files Created:
1. `REVIEW_SYSTEM_FIX.md` - Original fix documentation
2. `supabase/debug_review_rls.sql` - SQL queries to debug RLS policies

## How to Test

### 1. Check Console Logs
Open browser DevTools console on dashboard page. You should see:
```
📦 Delivered orders: 2 [{id: "...", status: "delivered", ...}]
🛒 All items from delivered orders: 3 [{orderId: "...", productId: 123, ...}]
✅ Existing reviews: 1 [{order_id: "...", product_id: 123}]
🔑 Reviewed set: ["order-uuid|123"]
⭐ Items to review: 2 [{orderId: "...", productId: 456, ...}]
```

### 2. Test Review Submission
1. Go to dashboard
2. Find "Reviews to write" section
3. Click "Rate now" on a product
4. Rate the product (1-5 stars) and add comment
5. Click "Submit Rating"
6. Should see success toast: "Review Submitted! Thank you for reviewing [Product Name]"
7. Item should disappear from "Reviews to write" list

### 3. Test Error Cases

**Already Reviewed:**
- Try to review same product from same order twice
- Should see toast: "Already Reviewed - You have already reviewed this product for this order."

**Not Delivered Order:**
- If trying to review from non-delivered order
- Should see toast: "Not Authorized - You can only review products from delivered orders."

### 4. Check Database
Run debug SQL queries in Supabase SQL editor:
```sql
-- See all reviews
SELECT * FROM public.order_reviews ORDER BY created_at DESC;

-- Check delivered orders
SELECT o.id, o.order_number, o.status, oi.product_id
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
WHERE LOWER(o.status) = 'delivered';
```

## Database Schema

### `order_reviews` table
```sql
CREATE TABLE order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL REFERENCES products(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (order_id, product_id, user_id)
)
```

**Key Points:**
- Unique constraint on (order_id, product_id, user_id) = one review per product per order
- Rating must be 1-5
- order_id is UUID (string), product_id is bigint (number)

### RLS Policies

**Insert Policy:**
```sql
CREATE POLICY "Users can insert own order reviews"
  ON public.order_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_reviews.order_id
        AND o.user_id = auth.uid()
        AND LOWER(o.status) = 'delivered'
        AND EXISTS (
          SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND oi.product_id = order_reviews.product_id
        )
    )
  )
```

**What it checks:**
1. User owns the review (user_id matches auth.uid())
2. Order exists and belongs to user
3. Order status is 'delivered'
4. Product is in that order's order_items

## Common Issues & Solutions

### Issue 1: Reviews still not working
**Debug Steps:**
1. Check console logs for delivered orders count
2. Verify order status is exactly "delivered" (lowercase)
3. Check if order_items table has correct product_id references
4. Run debug SQL to verify RLS policy logic

### Issue 2: Toast not showing
**Solution:**
- Make sure `<Toaster />` component is in root layout.tsx
- Import useToast hook correctly: `import { useToast } from "@/hooks/use-toast"`

### Issue 3: "Not Authorized" error even for valid orders
**Check:**
1. Order status is 'delivered' (case-insensitive check in code)
2. Product exists in order_items for that order
3. User is logged in (auth.uid() exists)
4. order_id and product_id data types match (UUID vs string, bigint vs number)

### Issue 4: Duplicate reviews
**Cause:** Unique constraint violation
**Solution:** Code now properly filters already-reviewed items using (order_id, product_id) pairs

## Type Safety Notes

### Important Type Conversions:
```typescript
// order_id: Always convert to string (it's UUID in DB)
order_id: String(orderId)

// product_id: Always convert to number (it's bigint in DB)
product_id: Number(productId)

// rating: Always convert to number
rating: Number(rating)
```

### Comparison Keys:
When creating review keys for filtering, always convert both sides:
```typescript
// CORRECT
const key = `${String(orderId)}|${Number(productId)}`

// WRONG - might cause type mismatch
const key = `${orderId}|${productId}`
```

## File Change Summary

✅ Modified:
- `lib/db/products.ts` - Fixed fetchReviewsByProductId query
- `app/dashboard/page.tsx` - Fixed review logic + added toast notifications
- `components/rating-modal.tsx` - Simplified to single rating
- `app/product/[id]/page.tsx` - Added realtime subscriptions

✅ Created:
- `REVIEW_SYSTEM_FIX.md` - Documentation
- `supabase/debug_review_rls.sql` - Debug queries
- `REVIEW_FIX_COMPLETE.md` - This file

## Next Steps

1. **Test thoroughly** in dev environment
2. **Remove console.log statements** after confirming it works
3. **Deploy to production** when ready
4. **Monitor** for any RLS policy issues in production

## Success Criteria

✅ Dashboard shows correct "reviews to write" items
✅ Users can submit reviews for delivered orders
✅ Reviews appear on product pages immediately (realtime)
✅ Toast notifications show proper error/success messages
✅ Same product from different orders can be reviewed multiple times
✅ Same product from same order can only be reviewed once
