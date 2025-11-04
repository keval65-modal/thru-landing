-- Check Zeo's Pizza complete state in Supabase
-- Run this in your Supabase SQL Editor

-- 1. Find Zeo's Pizza
SELECT 
  id,
  name,
  store_type,
  categories,
  is_active,
  is_active_on_thru,
  grocery_enabled,
  location,
  created_at,
  updated_at
FROM vendors
WHERE name ILIKE '%zeo%';

-- 2. Check what getActiveVendors() would return
SELECT 
  id,
  name,
  store_type,
  is_active,
  location
FROM vendors
WHERE is_active = true;

-- 3. If Zeo's is missing critical flags, run this FIX:
UPDATE vendors
SET 
  store_type = 'cafe',
  is_active = true,
  is_active_on_thru = true,
  grocery_enabled = true,
  updated_at = NOW()
WHERE name ILIKE '%zeo%';

-- 4. Verify the fix worked
SELECT 
  name,
  store_type,
  is_active,
  is_active_on_thru,
  location
FROM vendors
WHERE name ILIKE '%zeo%';

