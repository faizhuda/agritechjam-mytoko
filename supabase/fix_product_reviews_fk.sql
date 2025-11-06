-- Fix Foreign Key Relationship between product_reviews and profiles
-- This will allow Supabase to understand the relationship for joins

-- 1. Check current foreign keys on product_reviews
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='product_reviews';

-- 2. Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_table_exists;

-- 3. Add foreign key constraint if it doesn't exist
-- NOTE: This might fail if there's orphaned data (user_id in product_reviews but not in profiles)

-- First, let's check for orphaned data
SELECT 
  pr.user_id,
  COUNT(*) as review_count
FROM public.product_reviews pr
LEFT JOIN public.profiles p ON p.id = pr.user_id
WHERE p.id IS NULL
GROUP BY pr.user_id;

-- If there are orphaned reviews, you have 2 options:
-- OPTION A: Delete orphaned reviews (if user_id doesn't exist in profiles)
-- DELETE FROM public.product_reviews 
-- WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- OPTION B: Keep the data but don't add FK constraint
-- (This is safer if you want to preserve reviews even if user deleted)

-- 4. Add the foreign key constraint (only if no orphaned data)
-- Uncomment this if you want to add the FK:
/*
ALTER TABLE public.product_reviews 
DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;

ALTER TABLE public.product_reviews
ADD CONSTRAINT product_reviews_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;
*/

-- 5. Verify the constraint was added
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='product_reviews'
  AND kcu.column_name='user_id';
