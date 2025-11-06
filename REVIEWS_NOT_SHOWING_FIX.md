# FIX CUSTOMER REVIEWS TIDAK MUNCUL

## Masalah
Customer reviews tidak tampil di product page meskipun sudah ada rating dan review yang diisi.

## Kemungkinan Penyebab
1. **RLS Policy** - Tabel `product_reviews` tidak allow public read
2. **Data Migration** - Reviews masih di tabel lama `order_reviews`, belum ke `product_reviews`
3. **Table Join Issue** - Profiles table tidak allow public read (diperlukan untuk nama reviewer)

## Solusi (Jalankan di Supabase SQL Editor)

### STEP 1: Debug - Cek Database
File: `supabase/debug_product_reviews.sql`

Jalankan SQL ini untuk:
- Cek apakah tabel `product_reviews` ada
- Cek jumlah reviews di database
- Cek RLS policies
- Test query sebagai anonymous user

### STEP 2: Migration (Jika Product_Reviews Kosong)
File: `supabase/migrate_reviews_to_product_reviews.sql`

Jika hasil STEP 1 menunjukkan `product_reviews` kosong tapi `order_reviews` ada data:
- Jalankan SQL ini untuk migrate reviews dari tabel lama ke baru
- Akan auto-sync rating ke products table

### STEP 3: Fix RLS Policies
File: `supabase/product_reviews_public_read.sql`

Jalankan SQL ini untuk:
- Enable public read access ke `product_reviews`
- Enable public read access ke `profiles` (untuk nama reviewer)
- Drop semua conflicting policies

### STEP 4: Verify di Browser
1. Refresh product page
2. Buka Console (F12)
3. Cari log dengan emoji: 🔍 ✅ ❌
4. Reviews seharusnya sudah muncul!

## Console Debug Logs
Setelah fix, di browser console akan muncul:
```
🔍 Fetching reviews for product: 1
✅ Reviews data fetched: [...]
🔍 Product Page - Reviews loaded: [...]
🔍 Product Page - Reviews count: X
```

Jika masih error, akan muncul:
```
❌ Supabase fetchReviewsByProductId error: ...
```

Share error message tersebut untuk debugging lebih lanjut.
