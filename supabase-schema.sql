-- =========================================
-- Supabase Database Schema for Thru App
-- =========================================
-- Run this in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste and Run

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 1. ORDERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_quotes',
  items JSONB NOT NULL,
  route JSONB NOT NULL,
  detour_preferences JSONB,
  vendor_quotes JSONB DEFAULT '[]'::jsonb,
  selected_vendor_id TEXT,
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quote_deadline TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_quote_deadline ON orders(quote_deadline);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access on orders" ON orders;

-- RLS Policy: Users can read their own orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS Policy: Users can create their own orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Service role can do everything
CREATE POLICY "Service role has full access on orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

-- =========================================
-- 1B. PLACED ORDERS TABLE (CONSUMER APP)
-- =========================================

CREATE TABLE IF NOT EXISTS placed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  customer_info JSONB,
  trip_start_location TEXT,
  trip_destination TEXT,
  overall_status TEXT NOT NULL DEFAULT 'Pending Confirmation',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_gateway_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vendor_portions JSONB NOT NULL DEFAULT '[]'::jsonb,
  vendor_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_placed_orders_order_id ON placed_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_placed_orders_created_at ON placed_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_placed_orders_overall_status ON placed_orders(overall_status);
CREATE INDEX IF NOT EXISTS idx_placed_orders_vendor_ids ON placed_orders USING GIN(vendor_ids);

ALTER TABLE placed_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read placed orders" ON placed_orders;
DROP POLICY IF EXISTS "Customers can update placed orders" ON placed_orders;
DROP POLICY IF EXISTS "Service role manages placed orders" ON placed_orders;

CREATE POLICY "Customers can read placed orders"
  ON placed_orders FOR SELECT
  USING (auth.role() IN ('anon', 'authenticated', 'service_role'));

CREATE POLICY "Customers can update placed orders"
  ON placed_orders FOR UPDATE
  USING (auth.role() IN ('anon', 'authenticated'))
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Service role manages placed orders"
  ON placed_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- =========================================
-- 2. VENDORS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  location JSONB NOT NULL,
  location_point GEOGRAPHY(POINT, 4326),
  categories TEXT[] NOT NULL DEFAULT '{}',
  store_type TEXT,
  is_active BOOLEAN DEFAULT true,
  is_active_on_thru BOOLEAN DEFAULT false,
  grocery_enabled BOOLEAN DEFAULT false,
  operating_hours JSONB,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_vendors_location_point ON vendors USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_vendors_categories ON vendors USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_vendors_store_type ON vendors(store_type);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
DROP POLICY IF EXISTS "Service role can manage vendors" ON vendors;

-- RLS Policy: Everyone can read active vendors
CREATE POLICY "Anyone can view active vendors"
  ON vendors FOR SELECT
  USING (is_active = true);

-- RLS Policy: Service role can manage vendors
CREATE POLICY "Service role can manage vendors"
  ON vendors FOR ALL
  USING (auth.role() = 'service_role');

-- =========================================
-- 3. VENDOR RESPONSES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS vendor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL,
  total_price DECIMAL(10, 2),
  item_prices JSONB,
  estimated_ready_time TEXT,
  notes TEXT,
  counter_offer JSONB,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_responses_order_id ON vendor_responses(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_responses_vendor_id ON vendor_responses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_responses_status ON vendor_responses(status);
CREATE INDEX IF NOT EXISTS idx_vendor_responses_responded_at ON vendor_responses(responded_at DESC);

-- Enable RLS
ALTER TABLE vendor_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view responses for their orders" ON vendor_responses;
DROP POLICY IF EXISTS "Service role can manage responses" ON vendor_responses;

-- RLS Policy: Users can view responses for their orders
CREATE POLICY "Users can view responses for their orders"
  ON vendor_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = vendor_responses.order_id
      AND orders.user_id = auth.uid()::text
    )
  );

-- RLS Policy: Service role can manage responses
CREATE POLICY "Service role can manage responses"
  ON vendor_responses FOR ALL
  USING (auth.role() = 'service_role');

-- =========================================
-- 4. USER PROFILES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  name TEXT,
  email TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

-- RLS Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (firebase_uid = auth.uid()::text);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (firebase_uid = auth.uid()::text);

-- RLS Policy: Users can create their own profile
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

-- =========================================
-- 5. TRIGGERS & FUNCTIONS
-- =========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_placed_orders_updated_at ON placed_orders;
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Apply triggers to all tables
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_placed_orders_updated_at
  BEFORE UPDATE ON placed_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update vendor location_point from location JSONB
CREATE OR REPLACE FUNCTION update_vendor_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.location_point = ST_SetSRID(
      ST_MakePoint(
        (NEW.location->>'longitude')::DOUBLE PRECISION,
        (NEW.location->>'latitude')::DOUBLE PRECISION
      ),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_vendor_location_point ON vendors;

-- Apply trigger to vendors table
CREATE TRIGGER trigger_update_vendor_location_point
  BEFORE INSERT OR UPDATE OF location ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_location_point();

-- =========================================
-- 6. GEOSPATIAL FUNCTIONS
-- =========================================

-- Function to find vendors near a location
CREATE OR REPLACE FUNCTION vendors_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  location JSONB,
  categories TEXT[],
  store_type TEXT,
  is_active BOOLEAN,
  is_active_on_thru BOOLEAN,
  grocery_enabled BOOLEAN,
  operating_hours JSONB,
  fcm_token TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.phone,
    v.email,
    v.address,
    v.location,
    v.categories,
    v.store_type,
    v.is_active,
    v.is_active_on_thru,
    v.grocery_enabled,
    v.operating_hours,
    v.fcm_token,
    v.created_at,
    v.updated_at,
    ST_Distance(
      v.location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM vendors v
  WHERE v.is_active = true
    AND v.location_point IS NOT NULL
    AND ST_DWithin(
      v.location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$;

-- =========================================
-- 7. REALTIME PUBLICATION
-- =========================================

-- Enable Realtime for all tables
-- Note: You may need to enable this in Supabase Dashboard > Database > Replication

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['orders', 'placed_orders', 'vendors', 'vendor_responses', 'user_profiles'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime'
        AND c.relname = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- =========================================
-- SCHEMA SETUP COMPLETE
-- =========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Supabase schema setup complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review Row Level Security policies';
  RAISE NOTICE '2. Run the data migration script';
  RAISE NOTICE '3. Update your application code';
END $$;

















