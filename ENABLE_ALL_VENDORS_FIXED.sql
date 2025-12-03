-- ============================================
-- FIXED: Enable ALL Vendors (Works with JSONB location)
-- ============================================

-- OPTION 1: Simple - Enable ALL active vendors with location (RECOMMENDED)
-- This works regardless of location format (JSONB or GeoJSON)
UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE location IS NOT NULL;

-- Verify the update
SELECT 
  name,
  grocery_enabled,
  is_active,
  location
FROM vendors
ORDER BY created_at DESC;

-- ============================================
-- OPTION 2: More Selective - Only vendors with proper coordinates
-- ============================================

-- For JSONB with {latitude, longitude} format:
UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE location IS NOT NULL
  AND location::jsonb ? 'latitude'
  AND location::jsonb ? 'longitude'
  AND (location::jsonb->>'latitude')::float != 0
  AND (location::jsonb->>'longitude')::float != 0;

-- OR for GeoJSON format {type: "Point", coordinates: [lng, lat]}:
UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE location IS NOT NULL
  AND location::jsonb ? 'type'
  AND location::jsonb ? 'coordinates'
  AND location::jsonb->'coordinates'->0 IS NOT NULL;

-- ============================================
-- OPTION 3: Universal - Works with ANY format (SAFEST)
-- ============================================

UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE location IS NOT NULL
  AND location::text != 'null'
  AND location::text != '{}'
  AND location::text != '{"type":"Point","coordinates":[0,0]}';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check how many vendors were enabled
SELECT 
  COUNT(*) as total_enabled,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location
FROM vendors
WHERE grocery_enabled = true AND is_active = true;

-- See all enabled vendors with their location format
SELECT 
  name,
  grocery_enabled,
  is_active,
  location,
  CASE 
    WHEN location::jsonb ? 'latitude' THEN 'Format: {latitude, longitude}'
    WHEN location::jsonb ? 'type' THEN 'Format: GeoJSON Point'
    ELSE 'Format: Unknown'
  END as location_format
FROM vendors
WHERE grocery_enabled = true
ORDER BY created_at DESC;

-- ============================================
-- CHECK SPECIFIC VENDOR (Zeo's Pizza)
-- ============================================

SELECT 
  name,
  grocery_enabled,
  is_active,
  location
FROM vendors
WHERE name LIKE '%Zeo%';

-- If you need to enable just Zeo's Pizza:
UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';

-- ============================================
-- QUICK SUCCESS CHECK
-- ============================================

SELECT 
  'Total Vendors' as metric,
  COUNT(*)::text as value
FROM vendors

UNION ALL

SELECT 
  'Active & Grocery Enabled',
  COUNT(*)::text
FROM vendors
WHERE grocery_enabled = true AND is_active = true

UNION ALL

SELECT 
  'With Location Data',
  COUNT(*)::text
FROM vendors
WHERE location IS NOT NULL

UNION ALL

SELECT 
  'Zeo''s Pizza Enabled',
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO'
  END
FROM vendors
WHERE name LIKE '%Zeo%' AND grocery_enabled = true;














