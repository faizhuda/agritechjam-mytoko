-- Insert test reviews for your user
-- User ID: c5422fdd-fa14-47a1-8e2e-b3fff4683adf

-- Insert review for Headphone (product_id = 1)
INSERT INTO public.product_reviews (user_id, product_id, rating, comment)
VALUES (
  'c5422fdd-fa14-47a1-8e2e-b3fff4683adf',
  1,
  5,
  'Amazing sound quality! The noise cancellation is superb and battery life is incredible.'
)
ON CONFLICT (user_id, product_id) DO UPDATE
SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW();

-- Insert review for Wireless Mouse (product_id = 2)
INSERT INTO public.product_reviews (user_id, product_id, rating, comment)
VALUES (
  'c5422fdd-fa14-47a1-8e2e-b3fff4683adf',
  2,
  4,
  'Great mouse, very responsive and comfortable. Battery could last longer though.'
)
ON CONFLICT (user_id, product_id) DO UPDATE
SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW();

-- Insert review for Mechanical Keyboard (product_id = 3)
INSERT INTO public.product_reviews (user_id, product_id, rating, comment)
VALUES (
  'c5422fdd-fa14-47a1-8e2e-b3fff4683adf',
  3,
  5,
  'Best keyboard I have ever used! The mechanical switches feel amazing and the RGB lighting is beautiful.'
)
ON CONFLICT (user_id, product_id) DO UPDATE
SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW();

-- Verify reviews were inserted
SELECT 
  pr.id,
  pr.product_id,
  p.name as product_name,
  pr.rating,
  pr.comment,
  pr.created_at
FROM public.product_reviews pr
JOIN public.products p ON p.id = pr.product_id
WHERE pr.user_id = 'c5422fdd-fa14-47a1-8e2e-b3fff4683adf'
ORDER BY pr.product_id;

-- Check if products were updated
SELECT 
  p.id,
  p.name,
  p.rating as stored_rating,
  p.reviews as stored_count,
  COUNT(r.id) as actual_reviews,
  ROUND(AVG(r.rating)::numeric, 2) as actual_avg_rating
FROM public.products p
LEFT JOIN public.product_reviews r ON r.product_id = p.id
WHERE p.id IN (1, 2, 3)
GROUP BY p.id, p.name, p.rating, p.reviews
ORDER BY p.id;
