-- ✅ RUN THIS IN SUPABASE SQL EDITOR
-- This ensures Zeo's Pizza is properly configured

-- 1. Fix Zeo's Pizza state
UPDATE vendors
SET 
  store_type = 'cafe',
  is_active = true,
  is_active_on_thru = true,
  grocery_enabled = true,
  updated_at = NOW()
WHERE name ILIKE '%zeo%';

-- 2. Verify it worked
SELECT 
  name,
  store_type,
  is_active,
  is_active_on_thru,
  location
FROM vendors
WHERE name ILIKE '%zeo%';

