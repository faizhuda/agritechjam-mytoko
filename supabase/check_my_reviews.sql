-- Check all reviews for current user
-- Replace YOUR_USER_ID with your actual user ID from Supabase Auth

-- First, get your user ID (run this in Supabase SQL Editor)
SELECT auth.uid() as your_user_id;

-- Then check your reviews
SELECT 
  order_reviews.id,
  order_reviews.order_id,
  order_reviews.product_id,
  order_reviews.rating,
  order_reviews.comment,
  order_reviews.created_at,
  orders.order_number,
  products.name as product_name
FROM order_reviews
LEFT JOIN orders ON orders.id = order_reviews.order_id
LEFT JOIN products ON products.id = order_reviews.product_id
WHERE order_reviews.user_id = auth.uid()
ORDER BY order_reviews.created_at DESC;

-- If you see duplicate/orphaned reviews, delete them with:
-- DELETE FROM order_reviews WHERE id = 'REVIEW_ID_HERE';
