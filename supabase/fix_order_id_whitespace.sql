-- Fix whitespace in order IDs
-- This checks and fixes any UUIDs that have unexpected whitespace

-- 1. Check if there are any orders with whitespace in ID
SELECT 
  id,
  LENGTH(id::text) as length,
  id::text as id_string,
  CASE 
    WHEN id::text != TRIM(id::text) THEN 'HAS WHITESPACE'
    ELSE 'CLEAN'
  END as status
FROM public.orders
WHERE id::text != TRIM(id::text);

-- 2. Check order_items for whitespace
SELECT 
  id,
  order_id,
  LENGTH(order_id::text) as length,
  CASE 
    WHEN order_id::text != TRIM(order_id::text) THEN 'HAS WHITESPACE'
    ELSE 'CLEAN'
  END as status
FROM public.order_items
WHERE order_id::text != TRIM(order_id::text);

-- 3. If you find issues, you might need to recreate the data
-- Note: UUIDs should never have whitespace - this indicates data corruption
-- You may need to delete and recreate affected orders

-- Check specific order that's causing issues
SELECT 
  id,
  id::text,
  LENGTH(id::text) as id_length,
  order_number,
  status,
  user_id
FROM public.orders
WHERE id::text LIKE '%70a91b8b%';
