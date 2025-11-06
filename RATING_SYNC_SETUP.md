# Rating & Review System - Setup Guide

## Problem
Reviews were being saved to `order_reviews` table but product ratings in the `products` table were not being updated automatically. This caused ratings to not show in catalog, hero section, and product pages.

## Solution
Implemented automatic rating sync using PostgreSQL triggers and provided manual sync endpoint.

---

## 🔧 Setup Instructions

### Step 1: Run the SQL Migration
Execute the SQL file to create the trigger that auto-syncs ratings:

```bash
# In Supabase SQL Editor, run:
supabase/sync_product_ratings.sql
```

This will:
- Create a `update_product_rating()` function
- Create a trigger that fires on INSERT/UPDATE/DELETE on `order_reviews`
- Backfill existing ratings from current reviews
- Verify the results

### Step 2: Test the Automatic Sync
After running the migration:
1. Go to your dashboard
2. Rate a delivered product
3. Check the product page - rating should update immediately
4. Check catalog - rating should be updated there too

---

## 📊 How It Works

### Automatic Sync (Recommended)
The PostgreSQL trigger automatically updates `products.rating` and `products.reviews` whenever:
- A new review is added (INSERT)
- A review is updated (UPDATE)
- A review is deleted (DELETE)

**Formula:**
```sql
rating = AVG(all ratings for this product)
reviews = COUNT(all reviews for this product)
```

### Manual Sync (Fallback)
If you need to manually sync all ratings:

**API Endpoint:**
```
POST /api/products/sync-ratings
```

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/products/sync-ratings
```

**Response:**
```json
{
  "success": true,
  "message": "Product ratings synced successfully",
  "updated": 5,
  "reset": 10,
  "updates": [
    { "productId": 1, "rating": 4.5, "reviews": 4 },
    { "productId": 3, "rating": 5.0, "reviews": 2 }
  ]
}
```

---

## ✅ Verification

After setup, verify that ratings are working:

### 1. Check Database
```sql
-- See products with their ratings
SELECT 
  p.id,
  p.name,
  p.rating as stored_rating,
  p.reviews as stored_count,
  ROUND(AVG(r.rating)::numeric, 2) as calculated_rating,
  COUNT(r.id) as calculated_count
FROM products p
LEFT JOIN order_reviews r ON r.product_id = p.id
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
```

### 2. Check in Application
- ✅ Dashboard > Order History > Rate a delivered product
- ✅ Product page > Check rating stars and count
- ✅ Catalog page > Check product cards show correct rating
- ✅ Home page > Hero section shows updated ratings

---

## 🐛 Troubleshooting

### Ratings Not Updating?

**1. Check if trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_product_rating';
```

**2. Check trigger is enabled:**
```sql
ALTER TABLE order_reviews ENABLE TRIGGER trigger_update_product_rating;
```

**3. Test trigger manually:**
```sql
-- This should auto-update the product
INSERT INTO order_reviews (user_id, order_id, product_id, rating, comment)
VALUES (
  'your-user-id',
  'some-order-id',
  1,
  5,
  'Test review'
);

-- Check if product.rating updated
SELECT id, name, rating, reviews FROM products WHERE id = 1;
```

**4. Run manual sync:**
```bash
curl -X POST http://localhost:3000/api/products/sync-ratings
```

### Reviews Not Showing?

Check RLS policies:
```sql
-- Users should be able to read all reviews
SELECT * FROM order_reviews WHERE product_id = 1;
```

---

## 📝 Technical Details

### Database Schema

**order_reviews table:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to profiles)
- `order_id` (uuid, foreign key to orders)
- `product_id` (integer, foreign key to products)
- `rating` (integer, 1-5)
- `comment` (text, optional)
- `helpful` (integer, helpful count)
- `created_at` (timestamp)

**products table:**
- `id` (integer, primary key)
- `name` (text)
- `rating` (decimal, calculated average)
- `reviews` (integer, count of reviews)
- `updated_at` (timestamp)

### Trigger Logic
```sql
AFTER INSERT OR UPDATE OR DELETE ON order_reviews
FOR EACH ROW
→ Calculate AVG(rating) and COUNT(*) for affected product_id
→ UPDATE products SET rating = avg, reviews = count
```

---

## 🎯 Best Practices

1. **Always use the trigger** - It's automatic and reliable
2. **Run manual sync** only if something goes wrong
3. **Monitor logs** - Check Supabase logs for trigger errors
4. **Test after changes** - Verify ratings update after code deployments

---

## 🔗 Related Files

- `supabase/sync_product_ratings.sql` - Trigger creation script
- `app/api/products/sync-ratings/route.ts` - Manual sync endpoint
- `lib/db/products.ts` - `fetchReviewsByProductId()` function
- `app/product/[id]/page.tsx` - Product page with reviews display
- `components/rating-modal.tsx` - Rating submission modal
- `app/dashboard/page.tsx` - Dashboard with rating functionality

---

## ✨ Success Criteria

After setup, you should see:
- ⭐ Ratings update in real-time after submission
- 📊 Average rating reflects all reviews
- 🔢 Review count matches actual reviews
- 🏠 Home page shows correct ratings
- 📦 Catalog page shows correct ratings
- 🔍 Product pages show correct ratings

**The system is now fully functional and synced!** 🎉
