-- Create order_reviews table for product reviews within delivered orders
-- One review per product per order (can review same product multiple times from different orders)

CREATE TABLE IF NOT EXISTS order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id, product_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id ON order_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_product_id ON order_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_user_id ON order_reviews(user_id);

-- RLS Policies
ALTER TABLE order_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own order reviews" ON order_reviews;
DROP POLICY IF EXISTS "Users can insert own order reviews" ON order_reviews;
DROP POLICY IF EXISTS "Users can update own order reviews" ON order_reviews;

-- Users can read their own reviews
CREATE POLICY "Users can read own order reviews"
  ON order_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert reviews for products in their own delivered orders
CREATE POLICY "Users can insert own order reviews"
  ON order_reviews FOR INSERT
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

-- Users can update their own reviews (within 30 days)
CREATE POLICY "Users can update own order reviews"
  ON order_reviews FOR UPDATE
  USING (
    auth.uid() = user_id
    AND created_at > now() - interval '30 days'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON order_reviews TO authenticated;

COMMENT ON TABLE order_reviews IS 'Store product reviews from delivered orders (one review per product per order)';
