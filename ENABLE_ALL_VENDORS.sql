-- ============================================
-- OPTION 1: ENABLE ONLY ZEO'S PIZZA
-- ============================================
-- Use this if you want to test with just one vendor first

UPDATE vendors
SET 
  grocery_enabled = true,
  store_type = 'grocery',
  updated_at = NOW()
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';

-- Verify
SELECT name, store_type, grocery_enabled FROM vendors 
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';

-- ============================================
-- OPTION 2: ENABLE ALL EXISTING CAFES/RESTAURANTS
-- ============================================
-- Use this to enable ALL cafes and restaurants for grocery

UPDATE vendors
SET 
  grocery_enabled = true,
  store_type = 'grocery',
  updated_at = NOW()
WHERE store_type IN ('cafe', 'restaurant') 
  AND is_active = true;

-- Verify
SELECT name, store_type, grocery_enabled, is_active 
FROM vendors 
WHERE grocery_enabled = true
ORDER BY created_at DESC;

-- ============================================
-- OPTION 3: ENABLE ALL ACTIVE VENDORS
-- ============================================
-- Use this to enable EVERY active vendor for grocery orders
-- (Recommended for maximum vendor availability)

UPDATE vendors
SET 
  grocery_enabled = true,
  updated_at = NOW()
WHERE is_active = true;

-- Verify
SELECT 
  COUNT(*) as total_enabled,
  COUNT(CASE WHEN store_type = 'cafe' THEN 1 END) as cafes,
  COUNT(CASE WHEN store_type = 'restaurant' THEN 1 END) as restaurants,
  COUNT(CASE WHEN store_type = 'grocery' THEN 1 END) as grocery_stores
FROM vendors 
WHERE grocery_enabled = true AND is_active = true;

-- ============================================
-- OPTION 4: ENABLE SPECIFIC VENDORS BY NAME
-- ============================================
-- Use this to enable specific vendors you know

UPDATE vendors
SET 
  grocery_enabled = true,
  store_type = 'grocery',
  updated_at = NOW()
WHERE name IN (
  'Zeo''s Pizza',
  'Another Vendor Name',
  'Third Vendor Name'
) AND is_active = true;

-- ============================================
-- OPTION 5: SELECTIVE - ONLY VENDORS WITH LOCATION
-- ============================================
-- Safest option: Only enable vendors that have valid location data

UPDATE vendors
SET 
  grocery_enabled = true,
  updated_at = NOW()
WHERE is_active = true
  AND location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0);

-- Verify
SELECT 
  name,
  store_type,
  grocery_enabled,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude
FROM vendors 
WHERE grocery_enabled = true
ORDER BY created_at DESC;

-- ============================================
-- CHECK BEFORE ENABLING: See what will be affected
-- ============================================

-- See all vendors that WOULD be enabled (before actually doing it)
SELECT 
  name,
  store_type,
  is_active,
  grocery_enabled,
  location IS NOT NULL as has_location,
  CASE 
    WHEN location IS NULL THEN '❌ No Location'
    WHEN ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0 THEN '⚠️ Placeholder'
    ELSE '✅ Valid Location'
  END as location_status
FROM vendors
WHERE is_active = true
  AND grocery_enabled = false;  -- Currently disabled

-- Count how many would be affected
SELECT 
  COUNT(*) as vendors_to_enable,
  SUM(CASE WHEN location IS NOT NULL THEN 1 ELSE 0 END) as with_valid_location,
  SUM(CASE WHEN location IS NULL THEN 1 ELSE 0 END) as without_location
FROM vendors
WHERE is_active = true AND grocery_enabled = false;

-- ============================================
-- RECOMMENDED APPROACH (STAGED ROLLOUT)
-- ============================================

-- STAGE 1: Enable vendors with valid location only (SAFEST)
UPDATE vendors
SET grocery_enabled = true, updated_at = NOW()
WHERE is_active = true
  AND location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0)
  AND grocery_enabled = false;

-- Check how many were enabled
SELECT COUNT(*) as enabled_count FROM vendors WHERE grocery_enabled = true;

-- STAGE 2: Fix vendors without location, then enable them
-- (Do this after fixing their location data)

-- STAGE 3: Test with a few orders to ensure everything works

-- STAGE 4: Enable any remaining vendors once you're confident

-- ============================================
-- SUMMARY QUERY: Current vendor status
-- ============================================

SELECT 
  'Total Vendors' as metric,
  COUNT(*) as count
FROM vendors
UNION ALL
SELECT 
  'Active Vendors',
  COUNT(*) 
FROM vendors 
WHERE is_active = true
UNION ALL
SELECT 
  'Grocery Enabled',
  COUNT(*) 
FROM vendors 
WHERE grocery_enabled = true
UNION ALL
SELECT 
  'Active + Grocery Enabled',
  COUNT(*) 
FROM vendors 
WHERE is_active = true AND grocery_enabled = true
UNION ALL
SELECT 
  'Has Valid Location',
  COUNT(*) 
FROM vendors 
WHERE location IS NOT NULL 
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0)
UNION ALL
SELECT 
  'Ready for Orders (Active + Grocery + Location)',
  COUNT(*) 
FROM vendors 
WHERE is_active = true 
  AND grocery_enabled = true
  AND location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0);














