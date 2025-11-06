-- Debug: Check raw data from database

-- 1. Check products table directly
SELECT id, name, rating, reviews FROM public.products WHERE id IN (1,2,3) ORDER BY id;

-- 2. Check if reviews exist
SELECT * FROM public.product_reviews WHERE product_id IN (1,2,3) ORDER BY product_id;

-- 3. Check if trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_update_product_rating_simple';

-- 4. Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'update_product_rating_simple';

-- 5. Manually run the update (force sync)
UPDATE public.products 
SET rating = 5.0, reviews = 1 
WHERE id = 1;

UPDATE public.products 
SET rating = 4.0, reviews = 1 
WHERE id = 2;

UPDATE public.products 
SET rating = 5.0, reviews = 1 
WHERE id = 3;

-- 6. Verify the manual update worked
SELECT id, name, rating, reviews FROM public.products WHERE id IN (1,2,3) ORDER BY id;
