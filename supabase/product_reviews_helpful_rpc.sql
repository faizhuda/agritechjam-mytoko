-- Updated Helpful toggle for product_reviews table

-- 1) Create review_helpfuls table for product_reviews
CREATE TABLE IF NOT EXISTS public.review_helpfuls (
  review_id UUID NOT NULL,  -- Changed to allow reference to product_reviews
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- Add foreign key to product_reviews if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_helpfuls_review_id_fkey' 
    AND table_name = 'review_helpfuls'
  ) THEN
    ALTER TABLE public.review_helpfuls
    ADD CONSTRAINT review_helpfuls_review_id_fkey
    FOREIGN KEY (review_id) 
    REFERENCES public.product_reviews(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.review_helpfuls ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "read own helpful flags" ON public.review_helpfuls;
DROP POLICY IF EXISTS "insert own helpful flag" ON public.review_helpfuls;
DROP POLICY IF EXISTS "delete own helpful flag" ON public.review_helpfuls;

-- Create RLS policies
CREATE POLICY "read own helpful flags" 
  ON public.review_helpfuls 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "insert own helpful flag" 
  ON public.review_helpfuls 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete own helpful flag" 
  ON public.review_helpfuls 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.review_helpfuls TO authenticated;

-- 2) Create/Update toggle function for product_reviews
DROP FUNCTION IF EXISTS public.toggle_review_helpful(UUID);
DROP FUNCTION IF EXISTS public.toggle_review_helpful(TEXT);

CREATE OR REPLACE FUNCTION public.toggle_review_helpful(p_review_id TEXT)
RETURNS TABLE(helpful_count INTEGER, liked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_inserted INT := 0;
  v_helpful INT := 0;
  v_review_uuid UUID;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Convert text to UUID
  BEGIN
    v_review_uuid := p_review_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid review ID format';
  END;

  -- Try to insert a like; if it already exists, we'll delete instead
  INSERT INTO public.review_helpfuls(review_id, user_id)
  VALUES (v_review_uuid, v_user)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1 THEN
    -- Added like: increment helpful count
    UPDATE public.product_reviews
    SET helpful = COALESCE(helpful, 0) + 1
    WHERE id = v_review_uuid
    RETURNING helpful INTO v_helpful;
    
    RETURN QUERY SELECT v_helpful, TRUE;
  ELSE
    -- Remove like: decrement helpful count
    DELETE FROM public.review_helpfuls
    WHERE review_id = v_review_uuid AND user_id = v_user;
    
    UPDATE public.product_reviews
    SET helpful = GREATEST(COALESCE(helpful, 0) - 1, 0)
    WHERE id = v_review_uuid
    RETURNING helpful INTO v_helpful;
    
    RETURN QUERY SELECT v_helpful, FALSE;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.toggle_review_helpful(TEXT) TO authenticated;

-- Verify function was created
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'toggle_review_helpful';
