-- ============================================
-- ENSURE ALL FUTURE VENDORS HAVE REQUIRED FIELDS
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor

-- ============================================
-- 1. ADD NOT NULL CONSTRAINT TO LOCATION
-- ============================================
-- This ensures every vendor MUST have a location
-- (May fail if existing vendors have NULL location - fix those first)

-- First, update any vendors without location to a default
UPDATE vendors
SET location = ST_SetSRID(ST_MakePoint(0, 0), 4326)
WHERE location IS NULL;

-- Now add the constraint
ALTER TABLE vendors
ALTER COLUMN location SET NOT NULL;

-- ============================================
-- 2. ADD CHECK CONSTRAINT FOR VALID COORDINATES
-- ============================================
-- Ensures coordinates are within valid ranges
-- Latitude: -90 to 90, Longitude: -180 to 180

ALTER TABLE vendors
ADD CONSTRAINT valid_coordinates CHECK (
  ST_Y(location::geometry) BETWEEN -90 AND 90 AND
  ST_X(location::geometry) BETWEEN -180 AND 180
);

-- ============================================
-- 3. AUTO-ENABLE GROCERY FOR CERTAIN STORE TYPES
-- ============================================
-- Automatically set grocery_enabled based on store_type

CREATE OR REPLACE FUNCTION auto_enable_grocery()
RETURNS TRIGGER AS $$
BEGIN
  -- If store_type is grocery, cafe, or restaurant, enable grocery
  IF NEW.store_type IN ('grocery', 'cafe', 'restaurant') THEN
    NEW.grocery_enabled := true;
  END IF;
  
  -- If grocery_enabled is true, ensure is_active is also true
  IF NEW.grocery_enabled = true AND NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new vendors
DROP TRIGGER IF EXISTS trigger_auto_enable_grocery ON vendors;
CREATE TRIGGER trigger_auto_enable_grocery
BEFORE INSERT ON vendors
FOR EACH ROW
EXECUTE FUNCTION auto_enable_grocery();

-- ============================================
-- 4. VALIDATION FUNCTION FOR LOCATION
-- ============================================
-- Ensures location is not just (0, 0) - a common placeholder

CREATE OR REPLACE FUNCTION validate_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if location is the placeholder (0, 0)
  IF ST_X(NEW.location::geometry) = 0 AND ST_Y(NEW.location::geometry) = 0 THEN
    RAISE EXCEPTION 'Invalid location: Please provide actual coordinates, not (0, 0)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_location ON vendors;
CREATE TRIGGER trigger_validate_location
BEFORE INSERT OR UPDATE OF location ON vendors
FOR EACH ROW
EXECUTE FUNCTION validate_location();

-- ============================================
-- 5. ADD DEFAULT VALUES FOR NEW VENDORS
-- ============================================

-- Set default for is_active
ALTER TABLE vendors
ALTER COLUMN is_active SET DEFAULT true;

-- Set default for grocery_enabled based on common use case
-- ALTER TABLE vendors
-- ALTER COLUMN grocery_enabled SET DEFAULT true;

-- ============================================
-- 6. CREATE INDEX FOR LOCATION QUERIES
-- ============================================
-- Speeds up distance-based searches (if not already exists)

CREATE INDEX IF NOT EXISTS idx_vendors_location 
ON vendors USING GIST (location);

-- Index for grocery vendor queries
CREATE INDEX IF NOT EXISTS idx_vendors_grocery 
ON vendors (grocery_enabled, is_active) 
WHERE grocery_enabled = true AND is_active = true;

-- ============================================
-- 7. ADD HELPFUL COMMENTS TO COLUMNS
-- ============================================

COMMENT ON COLUMN vendors.location IS 
'Geographic location of vendor (PostGIS Point). REQUIRED. Must not be (0,0).';

COMMENT ON COLUMN vendors.grocery_enabled IS 
'Whether vendor accepts grocery orders. Auto-set to true for grocery/cafe/restaurant types.';

COMMENT ON COLUMN vendors.store_type IS 
'Type of store: grocery, cafe, restaurant, medical, etc. Affects auto-enablement of grocery orders.';

COMMENT ON COLUMN vendors.is_active IS 
'Whether vendor account is active. Must be true for vendor to appear in searches.';

-- ============================================
-- 8. VERIFY CONSTRAINTS ARE APPLIED
-- ============================================

-- Check constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'vendors'::regclass;

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vendors';

-- ============================================
-- 9. UPDATE EXISTING VENDORS (RUN ONCE)
-- ============================================
-- Apply the auto-enable logic to existing vendors

UPDATE vendors
SET grocery_enabled = true
WHERE store_type IN ('grocery', 'cafe', 'restaurant')
  AND grocery_enabled = false;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

-- Check all vendors have valid locations
SELECT 
  id,
  name,
  location IS NOT NULL as has_location,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM vendors
WHERE location IS NULL 
   OR (ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0);

-- Should return 0 rows if everything is correct

-- Check grocery vendor distribution
SELECT 
  store_type,
  COUNT(*) as total,
  SUM(CASE WHEN grocery_enabled THEN 1 ELSE 0 END) as grocery_enabled_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM vendors
GROUP BY store_type
ORDER BY total DESC;

-- ============================================
-- DONE!
-- ============================================
-- All future vendors will now:
-- ✅ REQUIRE a location (not null)
-- ✅ REQUIRE valid coordinates (not 0,0)
-- ✅ AUTO-ENABLE grocery for grocery/cafe/restaurant types
-- ✅ VALIDATE location on insert/update
-- ✅ Have proper indexes for fast queries














