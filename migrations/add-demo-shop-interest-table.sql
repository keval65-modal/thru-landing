-- Migration: Add demo_shop_interest table for customer and vendor sign-ups
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS demo_shop_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer fields
  name TEXT,
  email TEXT,
  
  -- Vendor fields
  shop_name TEXT,
  owner_name TEXT,
  shop_category TEXT,
  
  -- Common fields
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  city TEXT,
  notes TEXT,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demo_shop_interest_source ON demo_shop_interest(source);
CREATE INDEX IF NOT EXISTS idx_demo_shop_interest_phone ON demo_shop_interest(phone);
CREATE INDEX IF NOT EXISTS idx_demo_shop_interest_created_at ON demo_shop_interest(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_shop_interest_location ON demo_shop_interest USING GIST(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Enable RLS
ALTER TABLE demo_shop_interest ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all records
DROP POLICY IF EXISTS "Service role can manage demo shop interest" ON demo_shop_interest;
CREATE POLICY "Service role can manage demo shop interest"
  ON demo_shop_interest FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON demo_shop_interest TO service_role;
