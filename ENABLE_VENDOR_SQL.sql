-- ============================================
-- ENABLE ZEO'S PIZZA FOR GROCERY ORDERS
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor

UPDATE vendors
SET 
  grocery_enabled = true,
  store_type = 'grocery',
  updated_at = NOW()
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';

-- Verify the update
SELECT 
  id,
  name,
  store_type,
  grocery_enabled,
  is_active,
  location
FROM vendors
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';

-- ============================================
-- ENABLE ALL CAFES FOR GROCERY (OPTIONAL)
-- ============================================
-- If you want ALL cafes to show up in grocery searches:

-- UPDATE vendors
-- SET 
--   grocery_enabled = true,
--   store_type = 'grocery',
--   updated_at = NOW()
-- WHERE store_type = 'cafe' AND is_active = true;

-- ============================================
-- CHECK ALL GROCERY VENDORS
-- ============================================
-- See which vendors will appear in grocery searches:

SELECT 
  name,
  store_type,
  grocery_enabled,
  is_active,
  location,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM vendors
WHERE (grocery_enabled = true OR store_type = 'grocery')
  AND is_active = true
ORDER BY created_at DESC;














