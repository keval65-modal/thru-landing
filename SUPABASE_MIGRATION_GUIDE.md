# 🚀 Firebase to Supabase Migration Guide

## Overview

This guide covers migrating from Firebase to Supabase while **keeping Firebase Phone OTP authentication**. We'll migrate:

- ✅ **Keep Firebase Auth** - Phone OTP (working, no need to change)
- 🔄 **Migrate Firestore** → Supabase PostgreSQL
- 🔄 **Migrate Real-time Listeners** → Supabase Realtime
- 🔄 **Migrate Cloud Messaging** → OneSignal or Supabase Edge Functions
- 🔄 **Migrate Admin Operations** → Supabase Server-side calls

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Schema Migration](#database-schema-migration)
3. [Setup Supabase](#setup-supabase)
4. [Code Migration Steps](#code-migration-steps)
5. [Data Migration Script](#data-migration-script)
6. [Testing & Validation](#testing--validation)
7. [Deployment](#deployment)

---

## Prerequisites

### 1. Create Supabase Project

```bash
# Go to https://supabase.com
# Create a new project
# Note down:
# - Project URL
# - Anon/Public Key
# - Service Role Key (for server-side operations)
```

### 2. Install Supabase Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/ssr  # For Next.js App Router
```

### 3. Keep Firebase (Auth Only)

```bash
# Keep these packages for Phone OTP:
# firebase (already installed)
# firebase-admin (for token verification if needed)
```

---

## Database Schema Migration

### Current Firestore Collections → Supabase Tables

#### 1. **groceryOrders** Collection → `orders` Table

```sql
-- Create orders table
CREATE TABLE orders (
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
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS Policy: Users can create their own orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');
```

#### 2. **vendors** Collection → `vendors` Table

```sql
-- Create vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  location JSONB NOT NULL, -- {latitude: number, longitude: number}
  categories TEXT[] NOT NULL DEFAULT '{}',
  store_type TEXT, -- 'grocery', 'restaurant', 'medical'
  is_active BOOLEAN DEFAULT true,
  is_active_on_thru BOOLEAN DEFAULT false,
  grocery_enabled BOOLEAN DEFAULT false,
  operating_hours JSONB,
  fcm_token TEXT, -- For push notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_vendors_active ON vendors(is_active) WHERE is_active = true;
CREATE INDEX idx_vendors_location ON vendors USING GIN(location);
CREATE INDEX idx_vendors_categories ON vendors USING GIN(categories);
CREATE INDEX idx_vendors_store_type ON vendors(store_type);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read active vendors
CREATE POLICY "Anyone can view active vendors"
  ON vendors FOR SELECT
  USING (is_active = true);

-- RLS Policy: Service role can manage vendors
CREATE POLICY "Service role can manage vendors"
  ON vendors FOR ALL
  USING (auth.role() = 'service_role');
```

#### 3. **vendor_responses** Collection → `vendor_responses` Table

```sql
-- Create vendor responses table
CREATE TABLE vendor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL, -- 'accepted', 'rejected', 'counter_offer'
  total_price DECIMAL(10, 2),
  item_prices JSONB, -- Individual item prices
  estimated_ready_time TEXT,
  notes TEXT,
  counter_offer JSONB,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_vendor_responses_order_id ON vendor_responses(order_id);
CREATE INDEX idx_vendor_responses_vendor_id ON vendor_responses(vendor_id);
CREATE INDEX idx_vendor_responses_status ON vendor_responses(status);

-- Enable RLS
ALTER TABLE vendor_responses ENABLE ROW LEVEL SECURITY;

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
```

#### 4. **users** Collection → `user_profiles` Table

```sql
-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL, -- Link to Firebase Auth
  phone TEXT UNIQUE,
  name TEXT,
  email TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_firebase_uid ON user_profiles(firebase_uid);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and update their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);
```

#### 5. **Updated At Trigger** (Auto-update timestamps)

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
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
```

---

## Setup Supabase

### 1. Create Supabase Client

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton instance for client-side use
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}
```

### 2. Create Supabase Server Client

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  )
}

// For admin/service operations
export function createServiceSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
    {
      cookies: {},
    }
  )
}
```

### 3. Environment Variables

Update `.env.local`:

```env
# Keep Firebase for Phone OTP
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Add Supabase for Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vendor App Integration
NEXT_PUBLIC_VENDOR_API_URL=https://thru-vendor-dashboard-adb8o00cx-keval65-modals-projects.vercel.app/api

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Code Migration Steps

### Step 1: Migrate Order Service

Replace `src/lib/production-order-service.ts` with Supabase version:

```typescript
/**
 * Production Order Service - Supabase Version
 */

import { getSupabaseClient } from './supabase/client'
import { createServiceSupabaseClient } from './supabase/server'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  category?: string
}

export interface RouteInfo {
  startLocation: { lat: number; lng: number; address?: string }
  endLocation: { lat: number; lng: number; address?: string }
  distance?: string
  duration?: string
  polyline?: string
}

export interface DetourPreferences {
  maxDetourDistance: number
  preferredStoreTypes: string[]
  singleStorePreferred: boolean
}

export interface ProductionOrder {
  id: string
  userId: string
  items: OrderItem[]
  route: RouteInfo
  detourPreferences: DetourPreferences
  status: string
  vendorQuotes: any[]
  selectedVendorId?: string
  totalAmount?: number
  createdAt: Date
  updatedAt: Date
  quoteDeadline?: Date
}

export class ProductionOrderService {
  /**
   * Create a new order
   */
  static async createOrder(orderData: {
    userId: string
    items: OrderItem[]
    route: RouteInfo
    detourPreferences: DetourPreferences
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const supabase = getSupabaseClient()

      const order = {
        user_id: orderData.userId,
        items: orderData.items,
        route: orderData.route,
        detour_preferences: orderData.detourPreferences,
        status: 'pending_quotes',
        vendor_quotes: [],
        quote_deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }

      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Order created: ${data.id}`)

      // Notify vendors (separate service)
      await this.notifyVendorsForQuotes(data.id, orderData)

      return {
        success: true,
        orderId: data.id,
      }
    } catch (error) {
      console.error('Error creating order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      }
    }
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<ProductionOrder | null> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error

      return this.mapOrderFromDb(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  /**
   * Get user orders
   */
  static async getUserOrders(userId: string, options?: {
    status?: string
    limit?: number
  }): Promise<ProductionOrder[]> {
    try {
      const supabase = getSupabaseClient()

      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return data.map(this.mapOrderFromDb)
    } catch (error) {
      console.error('Error fetching user orders:', error)
      return []
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    updates?: Partial<ProductionOrder>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        ...updates,
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
      }
    }
  }

  /**
   * Map database record to ProductionOrder
   */
  private static mapOrderFromDb(data: any): ProductionOrder {
    return {
      id: data.id,
      userId: data.user_id,
      items: data.items,
      route: data.route,
      detourPreferences: data.detour_preferences,
      status: data.status,
      vendorQuotes: data.vendor_quotes || [],
      selectedVendorId: data.selected_vendor_id,
      totalAmount: data.total_amount,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      quoteDeadline: data.quote_deadline ? new Date(data.quote_deadline) : undefined,
    }
  }

  private static async notifyVendorsForQuotes(
    orderId: string,
    orderData: any
  ): Promise<void> {
    // Implementation to notify vendors via API or push notifications
    console.log('Notifying vendors for order:', orderId)
  }
}
```

### Step 2: Migrate Real-time Listeners

Replace `src/lib/order-listener-service.ts`:

```typescript
/**
 * Order Listener Service - Supabase Realtime Version
 */

import { getSupabaseClient } from './supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface OrderUpdate {
  orderId: string
  status: string
  vendorResponses?: any
  updatedAt: Date
  createdAt: Date
  items?: any[]
  route?: any
  userId?: string
}

export interface VendorResponseUpdate {
  orderId: string
  vendorId: string
  vendorName: string
  status: 'accepted' | 'rejected' | 'counter_offer'
  totalPrice?: number
  estimatedReadyTime?: string
  notes?: string
  counterOffer?: any
  responseTime: string
}

export class OrderListenerService {
  private channels: RealtimeChannel[] = []

  /**
   * Subscribe to real-time updates for a specific order
   */
  subscribeToOrder(
    orderId: string,
    onUpdate: (order: OrderUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('📦 Order update received:', payload)
          
          const data = payload.new
          const order: OrderUpdate = {
            orderId: data.id,
            status: data.status,
            vendorResponses: data.vendor_quotes,
            updatedAt: new Date(data.updated_at),
            createdAt: new Date(data.created_at),
            items: data.items,
            route: data.route,
            userId: data.user_id,
          }
          
          onUpdate(order)
        }
      )
      .subscribe()

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to vendor responses for an order
   */
  subscribeToVendorResponses(
    orderId: string,
    onResponse: (response: VendorResponseUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`vendor_responses:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendor_responses',
          filter: `order_id=eq.${orderId}`,
        },
        async (payload) => {
          console.log('🏪 Vendor response received:', payload)
          
          const data = payload.new
          
          // Fetch vendor name
          const { data: vendor } = await supabase
            .from('vendors')
            .select('name')
            .eq('id', data.vendor_id)
            .single()

          const response: VendorResponseUpdate = {
            orderId: data.order_id,
            vendorId: data.vendor_id,
            vendorName: vendor?.name || 'Unknown Vendor',
            status: data.status,
            totalPrice: data.total_price,
            estimatedReadyTime: data.estimated_ready_time,
            notes: data.notes,
            counterOffer: data.counter_offer,
            responseTime: data.responded_at,
          }
          
          onResponse(response)
        }
      )
      .subscribe()

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to all orders for a user
   */
  subscribeToUserOrders(
    userId: string,
    onUpdate: (orders: OrderUpdate[]) => void,
    options?: { status?: string; limit?: number }
  ): () => void {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`user_orders:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Fetch all orders for the user
          let query = supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (options?.status) {
            query = query.eq('status', options.status)
          }

          if (options?.limit) {
            query = query.limit(options.limit)
          }

          const { data, error } = await query

          if (error) {
            console.error('Error fetching orders:', error)
            return
          }

          const orders: OrderUpdate[] = data.map((order) => ({
            orderId: order.id,
            status: order.status,
            vendorResponses: order.vendor_quotes,
            updatedAt: new Date(order.updated_at),
            createdAt: new Date(order.created_at),
            items: order.items,
            route: order.route,
            userId: order.user_id,
          }))

          onUpdate(orders)
        }
      )
      .subscribe()

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Clean up all active listeners
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.channels.length} listeners`)
    const supabase = getSupabaseClient()
    this.channels.forEach((channel) => supabase.removeChannel(channel))
    this.channels = []
  }
}

// Singleton instance
export const orderListenerService = new OrderListenerService()
```

### Step 3: Migrate Vendor Service

Create `src/lib/supabase/vendor-service.ts`:

```typescript
/**
 * Vendor Service - Supabase Version
 */

import { getSupabaseClient } from './client'
import { createServiceSupabaseClient } from './server'

export interface Vendor {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  location: { latitude: number; longitude: number }
  categories: string[]
  storeType?: string
  isActive: boolean
  isActiveOnThru: boolean
  groceryEnabled: boolean
  operatingHours?: any
  fcmToken?: string
  createdAt: Date
  updatedAt: Date
}

export class VendorService {
  /**
   * Get all active vendors
   */
  static async getActiveVendors(filters?: {
    category?: string
    storeType?: string
  }): Promise<Vendor[]> {
    try {
      const supabase = getSupabaseClient()

      let query = supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)

      if (filters?.storeType) {
        query = query.eq('store_type', filters.storeType)
      }

      if (filters?.category) {
        query = query.contains('categories', [filters.category])
      }

      const { data, error } = await query

      if (error) throw error

      return data.map(this.mapVendorFromDb)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      return []
    }
  }

  /**
   * Get vendors near a location
   */
  static async getVendorsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<Vendor[]> {
    try {
      const supabase = getSupabaseClient()

      // Using PostGIS for geospatial queries
      // Note: You may need to enable PostGIS extension in Supabase
      const { data, error } = await supabase.rpc('vendors_near_location', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm,
      })

      if (error) throw error

      return data.map(this.mapVendorFromDb)
    } catch (error) {
      console.error('Error fetching nearby vendors:', error)
      return []
    }
  }

  /**
   * Update vendor FCM token
   */
  static async updateVendorFcmToken(
    vendorId: string,
    fcmToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const { error } = await supabase
        .from('vendors')
        .update({ fcm_token: fcmToken })
        .eq('id', vendorId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating FCM token:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update token',
      }
    }
  }

  private static mapVendorFromDb(data: any): Vendor {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      location: data.location,
      categories: data.categories,
      storeType: data.store_type,
      isActive: data.is_active,
      isActiveOnThru: data.is_active_on_thru,
      groceryEnabled: data.grocery_enabled,
      operatingHours: data.operating_hours,
      fcmToken: data.fcm_token,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}
```

### Step 4: Create PostGIS Function for Location Search

Run this in Supabase SQL Editor:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(POINT, 4326);

-- Create function to calculate vendors near a location
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
    AND ST_DWithin(
      v.location_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$;

-- Create trigger to update location_point from location JSONB
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

CREATE TRIGGER trigger_update_vendor_location_point
  BEFORE INSERT OR UPDATE OF location ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_location_point();
```

### Step 5: Replace Firebase Cloud Messaging

#### Option A: Use OneSignal (Recommended)

```bash
npm install react-onesignal
```

Create `src/lib/notifications/onesignal-service.ts`:

```typescript
/**
 * OneSignal Push Notification Service
 * Replaces Firebase Cloud Messaging
 */

export class PushNotificationService {
  /**
   * Initialize OneSignal
   */
  static async initialize() {
    if (typeof window === 'undefined') return

    const OneSignal = (await import('react-onesignal')).default

    await OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: true,
    })
  }

  /**
   * Send notification to vendor
   */
  static async sendVendorNotification(
    vendorId: string,
    notification: {
      title: string
      message: string
      data?: any
    }
  ) {
    try {
      // Call your API endpoint that triggers OneSignal
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          notification,
        }),
      })

      return await response.json()
    } catch (error) {
      console.error('Error sending notification:', error)
      return { success: false, error }
    }
  }
}
```

#### Option B: Use Supabase Edge Functions

Create a Supabase Edge Function for sending notifications.

---

## Data Migration Script

Create `scripts/migrate-firebase-to-supabase.ts`:

```typescript
/**
 * Firebase to Supabase Data Migration Script
 * 
 * This script migrates all data from Firestore to Supabase
 * 
 * Usage: npx tsx scripts/migrate-firebase-to-supabase.ts
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const firestore = getFirestore(firebaseApp)

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateVendors() {
  console.log('📦 Migrating vendors...')
  
  const snapshot = await firestore.collection('vendors').get()
  const vendors = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    vendors.push({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      location: data.location,
      categories: data.categories || [],
      store_type: data.storeType || data.store_type,
      is_active: data.isActive ?? true,
      is_active_on_thru: data.isActiveOnThru ?? false,
      grocery_enabled: data.groceryEnabled ?? false,
      operating_hours: data.operatingHours || data.operating_hours,
      fcm_token: data.fcmToken || data.fcm_token,
      created_at: data.createdAt?.toDate() || new Date(),
      updated_at: data.updatedAt?.toDate() || new Date(),
    })
  }

  const { data, error } = await supabase
    .from('vendors')
    .upsert(vendors, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating vendors:', error)
  } else {
    console.log(`✅ Migrated ${vendors.length} vendors`)
  }
}

async function migrateOrders() {
  console.log('📦 Migrating orders...')
  
  const snapshot = await firestore.collection('groceryOrders').get()
  const orders = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    orders.push({
      user_id: data.userId,
      status: data.status,
      items: data.items,
      route: data.route,
      detour_preferences: data.detourPreferences,
      vendor_quotes: data.vendorQuotes || data.vendorResponses || [],
      selected_vendor_id: data.selectedVendorId,
      total_amount: data.totalAmount,
      created_at: data.createdAt?.toDate() || new Date(),
      updated_at: data.updatedAt?.toDate() || new Date(),
      quote_deadline: data.quoteDeadline?.toDate(),
    })
  }

  if (orders.length > 0) {
    const { data, error } = await supabase
      .from('orders')
      .upsert(orders, { onConflict: 'id' })

    if (error) {
      console.error('❌ Error migrating orders:', error)
    } else {
      console.log(`✅ Migrated ${orders.length} orders`)
    }
  }
}

async function migrateUsers() {
  console.log('📦 Migrating users...')
  
  const snapshot = await firestore.collection('users').get()
  const users = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    users.push({
      firebase_uid: doc.id,
      phone: data.phone,
      name: data.name,
      email: data.email,
      preferences: data.preferences || {},
      created_at: data.createdAt?.toDate() || new Date(),
      updated_at: data.updatedAt?.toDate() || new Date(),
    })
  }

  if (users.length > 0) {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(users, { onConflict: 'firebase_uid' })

    if (error) {
      console.error('❌ Error migrating users:', error)
    } else {
      console.log(`✅ Migrated ${users.length} users`)
    }
  }
}

async function main() {
  console.log('🚀 Starting Firebase to Supabase migration...\n')

  try {
    await migrateVendors()
    await migrateUsers()
    await migrateOrders()

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
```

Add to `package.json`:

```json
{
  "scripts": {
    "migrate:firebase-to-supabase": "tsx scripts/migrate-firebase-to-supabase.ts"
  }
}
```

---

## Testing & Validation

### 1. Test Database Connection

Create `src/app/api/test/supabase/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('vendors')
      .select('count')
      .limit(1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
```

### 2. Test Real-time Subscriptions

Visit `/test-supabase-realtime` to test:
- Order updates
- Vendor response notifications
- Real-time data sync

### 3. Test Phone OTP (Firebase - No Changes)

Visit `/login` and `/signup` to ensure Firebase Phone OTP still works.

---

## Deployment Checklist

- [ ] Run SQL schema in Supabase dashboard
- [ ] Add environment variables to Vercel
- [ ] Migrate data using migration script
- [ ] Update all API routes to use Supabase
- [ ] Update all hooks to use Supabase
- [ ] Test real-time functionality
- [ ] Test phone authentication (Firebase)
- [ ] Deploy to Vercel
- [ ] Monitor for errors

---

## Rollback Plan

If issues occur:

```bash
# Revert to Firebase
git checkout <previous-commit>
vercel --prod

# Or keep Supabase but fix issues incrementally
```

---

## Benefits of This Hybrid Approach

✅ **Keep Firebase Phone OTP** - Working solution, no need to change
✅ **Supabase PostgreSQL** - More powerful queries, better performance
✅ **Supabase Realtime** - Built-in WebSocket subscriptions
✅ **PostGIS** - Advanced geospatial queries for vendor discovery
✅ **Row Level Security** - Better data security
✅ **Cost Effective** - Supabase free tier is generous
✅ **Better Developer Experience** - SQL queries are easier than Firestore

---

## Next Steps

1. **Set up Supabase project**
2. **Run database schema SQL**
3. **Install dependencies**
4. **Create Supabase client files**
5. **Run data migration script**
6. **Update services one by one**
7. **Test thoroughly**
8. **Deploy!**

---

**Questions or issues? Check the Supabase docs: https://supabase.com/docs**



