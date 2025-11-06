-- Migration: Add product-level reviews to order_reviews table
-- This allows users to review each product in their delivered orders

-- Step 0: Ensure table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text,
  helpful integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Step 0.5: Quick check (run first, non-destructive)
SELECT count(*) AS order_reviews_count FROM public.order_reviews;

-- Step 1: Add new columns (nullable for now) and CHECK constraint
ALTER TABLE public.order_reviews
  ADD COLUMN IF NOT EXISTS product_id bigint,
  ADD COLUMN IF NOT EXISTS rating integer;

-- Add CHECK constraint for rating separately (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_reviews_rating_check' AND conrelid = 'public.order_reviews'::regclass
  ) THEN
    ALTER TABLE public.order_reviews
      ADD CONSTRAINT order_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

-- Add foreign key constraint (drop first if exists to avoid error on re-run)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_reviews_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_reviews
      ADD CONSTRAINT order_reviews_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: (Optional) Populate new columns for existing rows
-- Only run if you understand and accept the mapping. This example assigns the
-- first product from the order_items for that order and uses a default rating of 5.
-- COMMENT OUT if you don't want automatic mapping.
UPDATE public.order_reviews r
SET product_id = subq.product_id,
    rating = COALESCE(r.product_rating, 5)
FROM (
  SELECT DISTINCT ON (oi.order_id) oi.order_id, oi.product_id
  FROM public.order_items oi
  ORDER BY oi.order_id, oi.id
) AS subq
WHERE r.order_id = subq.order_id
  AND r.product_id IS NULL;

-- Step 3: Set NOT NULL constraints (only after verifying population)
-- Run these only if product_id and rating are populated for all rows (or table empty).
-- If any NULL remains, the ALTER will fail safely.
DO $$ 
BEGIN
  -- Check for NULLs before setting NOT NULL
  IF NOT EXISTS (SELECT 1 FROM public.order_reviews WHERE product_id IS NULL LIMIT 1) THEN
    ALTER TABLE public.order_reviews ALTER COLUMN product_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping product_id NOT NULL: NULL values found. Run Step 2 first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_reviews WHERE rating IS NULL LIMIT 1) THEN
    ALTER TABLE public.order_reviews ALTER COLUMN rating SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping rating NOT NULL: NULL values found. Run Step 2 first.';
  END IF;
END $$;

-- Step 3.5: Clean duplicates before applying unique constraint
-- This deletes older duplicate reviews (keeps the latest by created_at).
DELETE FROM public.order_reviews r
WHERE r.id NOT IN (
  SELECT DISTINCT ON (order_id, product_id, user_id) id
  FROM public.order_reviews
  ORDER BY order_id, product_id, user_id, created_at DESC
);

-- Step 4: Add unique constraint and indexes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_reviews_order_product_user_unique'
  ) THEN
    ALTER TABLE public.order_reviews
      ADD CONSTRAINT order_reviews_order_product_user_unique
      UNIQUE (order_id, product_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id ON public.order_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON public.order_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_user_id ON public.order_reviews(user_id);

-- Step 5: Update RLS policies
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order reviews" ON public.order_reviews;
DROP POLICY IF EXISTS "Users can insert own order reviews" ON public.order_reviews;
DROP POLICY IF EXISTS "Users can update own order reviews" ON public.order_reviews;

CREATE POLICY "Users can read own order reviews"
  ON public.order_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own order reviews"
  ON public.order_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_reviews.order_id
        AND o.user_id = auth.uid()
        AND LOWER(o.status) = 'delivered'
        AND EXISTS (
          SELECT 1
          FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND oi.product_id = order_reviews.product_id
        )
    )
  );

CREATE POLICY "Users can update own order reviews"
  ON public.order_reviews FOR UPDATE
  USING (
    auth.uid() = user_id
    AND created_at > now() - interval '30 days'
  );

-- Step 6: Grant role permissions
GRANT SELECT, INSERT, UPDATE ON public.order_reviews TO authenticated;

-- Step 7: Clean up old order-level rating columns (optional, destructive)
-- Only run if you have migrated or no longer need these columns.
-- If columns don't exist, these will silently skip (IF EXISTS).
DO $$ 
BEGIN
  ALTER TABLE public.order_reviews DROP COLUMN IF EXISTS product_rating;
  ALTER TABLE public.order_reviews DROP COLUMN IF EXISTS service_rating;
  ALTER TABLE public.order_reviews DROP COLUMN IF EXISTS delivery_rating;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Old columns already dropped or never existed.';
END $$;

-- Comment describing table purpose (optional)
COMMENT ON TABLE public.order_reviews IS 'Store product reviews scoped to each order item (one review per product per order)';
