-- Add payment_proof_url column to orders table
-- This will store the URL of the uploaded payment proof image

-- Step 1: Add column (nullable first for existing orders)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- Step 2: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON public.orders(payment_proof_url);

-- Step 3: Add check constraint for new orders (optional - can be enabled later)
-- This ensures new orders MUST have payment proof
-- Comment out if you want to allow old orders without payment proof
-- ALTER TABLE public.orders
-- ADD CONSTRAINT orders_payment_proof_required 
-- CHECK (
--   created_at < '2025-11-06'::timestamp OR 
--   payment_proof_url IS NOT NULL
-- );

-- Comment
COMMENT ON COLUMN public.orders.payment_proof_url IS 'URL of the uploaded payment proof image from Supabase Storage (mandatory for new orders)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'payment_proof_url';
