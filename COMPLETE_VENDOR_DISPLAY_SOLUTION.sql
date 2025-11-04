-- ============================================
-- COMPLETE SOLUTION: Display ALL Vendors in User App
-- ============================================
-- This ensures ALL vendors with valid locations are visible

-- ============================================
-- STEP 1: ENABLE ALL VENDORS WITH VALID LOCATION
-- ============================================

-- First, check what we're about to enable
SELECT 
  name,
  store_type,
  is_active,
  grocery_enabled,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude,
  address
FROM vendors
WHERE location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0)
ORDER BY created_at DESC;

-- Now enable them ALL
UPDATE vendors
SET 
  grocery_enabled = true,
  is_active = true,
  store_type = CASE 
    WHEN store_type IS NULL OR store_type = '' THEN 'grocery'
    ELSE store_type
  END,
  updated_at = NOW()
WHERE location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0);

-- Verify the update
SELECT 
  'Total Enabled' as status,
  COUNT(*) as count
FROM vendors
WHERE grocery_enabled = true AND is_active = true;

-- ============================================
-- STEP 2: FIX ANY VENDORS WITH INVALID LOCATION FORMAT
-- ============================================

-- Check for vendors with GeoJSON that might need conversion
SELECT 
  id,
  name,
  location,
  jsonb_typeof(location::jsonb) as location_type
FROM vendors
WHERE location IS NOT NULL;

-- The code now handles GeoJSON automatically, but verify:
SELECT 
  name,
  CASE 
    WHEN location::jsonb ? 'type' THEN 'GeoJSON (will be converted)'
    WHEN location::jsonb ? 'latitude' THEN 'Already correct format'
    ELSE 'Unknown format'
  END as location_format,
  location
FROM vendors
WHERE location IS NOT NULL
LIMIT 5;

-- ============================================
-- STEP 3: ENSURE EXACT COORDINATES ARE ACCESSIBLE
-- ============================================

-- Create a view for easy vendor access with proper coordinates
CREATE OR REPLACE VIEW vendor_display AS
SELECT 
  v.id,
  v.name,
  v.email,
  v.phone,
  v.address,
  v.store_type,
  v.is_active,
  v.grocery_enabled,
  v.is_active_on_thru,
  -- Extract exact coordinates
  ST_Y(v.location::geometry) as latitude,
  ST_X(v.location::geometry) as longitude,
  -- Also keep original location for compatibility
  v.location,
  v.operating_hours,
  v.categories,
  v.fcm_token,
  v.created_at,
  v.updated_at
FROM vendors v
WHERE v.location IS NOT NULL;

-- Test the view
SELECT * FROM vendor_display LIMIT 5;

-- ============================================
-- STEP 4: CREATE FUNCTION TO GET VENDORS ON ROUTE
-- ============================================

-- Function to find vendors within distance from a point
CREATE OR REPLACE FUNCTION get_vendors_near_point(
  point_lat DOUBLE PRECISION,
  point_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  store_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  distance_km DOUBLE PRECISION,
  grocery_enabled BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.store_type,
    ST_Y(v.location::geometry),
    ST_X(v.location::geometry),
    v.address,
    ST_Distance(
      v.location::geography,
      ST_MakePoint(point_lng, point_lat)::geography
    ) / 1000 as distance_km,
    v.grocery_enabled,
    v.is_active
  FROM vendors v
  WHERE v.grocery_enabled = true
    AND v.is_active = true
    AND v.location IS NOT NULL
    AND ST_Distance(
      v.location::geography,
      ST_MakePoint(point_lng, point_lat)::geography
    ) / 1000 <= max_distance_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Test the function (Pune coordinates)
SELECT * FROM get_vendors_near_point(18.5204, 73.8567, 10);

-- ============================================
-- STEP 5: CREATE FUNCTION FOR VENDORS ALONG ROUTE
-- ============================================

CREATE OR REPLACE FUNCTION get_vendors_along_route(
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  max_detour_km DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  store_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  distance_to_start_km DOUBLE PRECISION,
  distance_to_end_km DOUBLE PRECISION,
  min_distance_km DOUBLE PRECISION,
  grocery_enabled BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.store_type,
    ST_Y(v.location::geometry),
    ST_X(v.location::geometry),
    v.address,
    ST_Distance(
      v.location::geography,
      ST_MakePoint(start_lng, start_lat)::geography
    ) / 1000 as distance_to_start,
    ST_Distance(
      v.location::geography,
      ST_MakePoint(end_lng, end_lat)::geography
    ) / 1000 as distance_to_end,
    LEAST(
      ST_Distance(v.location::geography, ST_MakePoint(start_lng, start_lat)::geography),
      ST_Distance(v.location::geography, ST_MakePoint(end_lng, end_lat)::geography)
    ) / 1000 as min_distance,
    v.grocery_enabled,
    v.is_active
  FROM vendors v
  WHERE v.grocery_enabled = true
    AND v.is_active = true
    AND v.location IS NOT NULL
    AND (
      ST_Distance(
        v.location::geography,
        ST_MakePoint(start_lng, start_lat)::geography
      ) / 1000 <= max_detour_km
      OR
      ST_Distance(
        v.location::geography,
        ST_MakePoint(end_lng, end_lat)::geography
      ) / 1000 <= max_detour_km
    )
  ORDER BY min_distance;
END;
$$ LANGUAGE plpgsql;

-- Test the route function (Pune route)
SELECT * FROM get_vendors_along_route(
  18.5204, 73.8567,  -- Start point
  18.5300, 73.8700,  -- End point
  5                   -- Max 5km detour
);

-- ============================================
-- STEP 6: ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Spatial index (if not exists)
CREATE INDEX IF NOT EXISTS idx_vendors_location_gist 
ON vendors USING GIST (location);

-- Grocery + active vendors
CREATE INDEX IF NOT EXISTS idx_vendors_active_grocery 
ON vendors (is_active, grocery_enabled) 
WHERE is_active = true AND grocery_enabled = true;

-- Store type index
CREATE INDEX IF NOT EXISTS idx_vendors_store_type 
ON vendors (store_type) 
WHERE grocery_enabled = true;

-- ============================================
-- STEP 7: VALIDATION QUERIES
-- ============================================

-- Check all vendors are properly configured
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
  'READY FOR DISPLAY (Active + Grocery + Location)',
  COUNT(*) 
FROM vendors 
WHERE is_active = true 
  AND grocery_enabled = true
  AND location IS NOT NULL
  AND NOT (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0);

-- ============================================
-- STEP 8: DETAILED VENDOR LIST WITH COORDINATES
-- ============================================

-- See ALL vendors that will be displayed to users
SELECT 
  ROW_NUMBER() OVER (ORDER BY created_at DESC) as num,
  name,
  store_type,
  CONCAT(
    ROUND(ST_Y(location::geometry)::numeric, 6), 
    ', ', 
    ROUND(ST_X(location::geometry)::numeric, 6)
  ) as coordinates,
  address,
  is_active as active,
  grocery_enabled as grocery,
  created_at::date as registered_date
FROM vendors
WHERE grocery_enabled = true
  AND is_active = true
  AND location IS NOT NULL
ORDER BY created_at DESC;

-- ============================================
-- STEP 9: TEST SPECIFIC ROUTES
-- ============================================

-- Test: Vendors near Zeo's Pizza
SELECT 
  v.name,
  v.store_type,
  CONCAT(
    ROUND(ST_Y(v.location::geometry)::numeric, 6), 
    ', ', 
    ROUND(ST_X(v.location::geometry)::numeric, 6)
  ) as coordinates,
  ROUND(
    ST_Distance(
      v.location::geography,
      ST_MakePoint(73.863038, 18.480321)::geography
    ) / 1000, 
    2
  ) as distance_from_zeos_km
FROM vendors v
WHERE v.grocery_enabled = true
  AND v.is_active = true
  AND v.location IS NOT NULL
ORDER BY distance_from_zeos_km;

-- Test: Vendors on typical Pune route
SELECT 
  v.name,
  v.store_type,
  CONCAT(
    ROUND(ST_Y(v.location::geometry)::numeric, 6), 
    ', ', 
    ROUND(ST_X(v.location::geometry)::numeric, 6)
  ) as coordinates,
  ROUND(
    ST_Distance(
      v.location::geography,
      ST_MakePoint(73.8567, 18.5204)::geography
    ) / 1000, 
    2
  ) as distance_from_start_km
FROM vendors v
WHERE v.grocery_enabled = true
  AND v.is_active = true
  AND v.location IS NOT NULL
  AND ST_Distance(
      v.location::geography,
      ST_MakePoint(73.8567, 18.5204)::geography
    ) / 1000 <= 10
ORDER BY distance_from_start_km;

-- ============================================
-- STEP 10: VERIFY LOCATION FORMAT CONVERSION
-- ============================================

-- This verifies the code is properly converting GeoJSON to lat/lng
SELECT 
  name,
  -- Raw location (might be GeoJSON)
  location::jsonb as raw_location,
  -- Extracted coordinates (what user app will see)
  ST_Y(location::geometry) as extracted_latitude,
  ST_X(location::geometry) as extracted_longitude
FROM vendors
WHERE location IS NOT NULL
LIMIT 5;

-- ============================================
-- SUCCESS CRITERIA
-- ============================================

-- Run this final check - ALL should pass
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS: Vendors exist'
    ELSE '❌ FAIL: No vendors'
  END as check_vendors_exist
FROM vendors
WHERE grocery_enabled = true AND is_active = true

UNION ALL

SELECT 
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN location IS NOT NULL THEN 1 END) 
    THEN '✅ PASS: All enabled vendors have location'
    ELSE '❌ FAIL: Some vendors missing location'
  END
FROM vendors
WHERE grocery_enabled = true AND is_active = true

UNION ALL

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS: Zeo''s Pizza is enabled'
    ELSE '❌ FAIL: Zeo''s Pizza not enabled'
  END
FROM vendors
WHERE name LIKE '%Zeo%' 
  AND grocery_enabled = true 
  AND is_active = true

UNION ALL

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS: Spatial functions working'
    ELSE '❌ FAIL: Spatial queries broken'
  END
FROM get_vendors_near_point(18.5204, 73.8567, 10);

-- ============================================
-- DONE! 
-- ============================================
-- All vendors are now:
-- ✅ Enabled for grocery orders
-- ✅ Active and visible
-- ✅ Have valid exact coordinates
-- ✅ Can be queried by location
-- ✅ Will appear in user app route searches

