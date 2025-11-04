# 🏪 Vendor App - Supabase Migration Guide

## Overview

This guide shows you how to connect your **Vendor App** to Supabase so vendors can:
- See new orders in real-time
- Submit quotes/responses
- Track order status

Both User App and Vendor App will use the same Supabase database for seamless communication!

---

## 🎯 Architecture

```
┌─────────────────────────────────────────┐
│                                          │
│     👤 USER APP    ←→    🏪 VENDOR APP │
│                                          │
│           ↓               ↓              │
│           └───→ SUPABASE ←───┘          │
│                                          │
│         • orders table                   │
│         • vendor_responses table         │
│         • Real-time subscriptions        │
│                                          │
└─────────────────────────────────────────┘
```

---

## 📋 Pre-requisites

- [ ] Vendor app repository cloned locally
- [ ] Supabase project URL and keys (same as user app)
- [ ] Node.js and npm installed

---

## Step 1: Install Supabase Dependencies

In your vendor app directory:

```bash
npm install @supabase/supabase-js@2.45.0
npm install @supabase/ssr@0.5.0
```

---

## Step 2: Copy Supabase Client Files

Copy these files from the **user app** to your **vendor app**:

### From: `thru-user-app/src/lib/supabase/`
### To: `vendor-app/src/lib/supabase/` (or `vendor-app/lib/supabase/`)

**Files to copy:**
1. ✅ `client.ts` - Browser client
2. ✅ `server.ts` - Server client
3. ✅ `types.ts` - TypeScript types

These files are already created and ready to use!

---

## Step 3: Add Environment Variables

### A. Local Development (`.env.local`)

Create or update `.env.local` in your vendor app:

```env
# ============================================
# SUPABASE (Same as User App)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://wrrdzzvotznletjclzcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# FIREBASE (if vendor app uses Firebase Auth)
# ============================================
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# ... (keep existing Firebase vars if needed)
```

### B. Production (Vercel)

1. Go to https://vercel.com/dashboard
2. Select your vendor app project
3. Go to **Settings** > **Environment Variables**
4. Add all the Supabase variables above
5. Select: Production, Preview, Development
6. Click **Save**

---

## Step 4: Update Vendor Dashboard - View Orders

### Old Code (Firebase):

```typescript
// vendor-app/app/dashboard/page.tsx (or similar)
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

// Listen to orders
const q = query(
  collection(db, 'groceryOrders'),
  where('status', '==', 'pending_quotes')
)

onSnapshot(q, (snapshot) => {
  const orders = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
  setOrders(orders)
})
```

### New Code (Supabase):

```typescript
// vendor-app/app/dashboard/page.tsx (or similar)
import { getSupabaseClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function VendorDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Initial fetch
    fetchOrders()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('vendor-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.pending_quotes'
        },
        (payload) => {
          console.log('📦 New order or update:', payload)
          fetchOrders() // Refetch orders
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending_quotes')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log(`✅ Fetched ${data.length} pending orders`)
      setOrders(data)
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Render orders...
}
```

---

## Step 5: Update Vendor Response Submission

### Old Code (Firebase):

```typescript
// vendor-app/app/api/vendor-responses/route.ts
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function POST(request: Request) {
  const { orderId, vendorId, status, price } = await request.json()

  // Update order in Firebase
  await updateDoc(doc(db, 'groceryOrders', orderId), {
    status: 'confirmed',
    selectedVendorId: vendorId,
    totalAmount: price
  })

  return Response.json({ success: true })
}
```

### New Code (Supabase):

```typescript
// vendor-app/app/api/vendor-responses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { orderId, vendorId, status, totalPrice, itemPrices, estimatedReadyTime, notes } = await request.json()

    const supabase = createServiceSupabaseClient()

    // 1. Insert vendor response
    const { data: response, error: responseError } = await supabase
      .from('vendor_responses')
      .insert({
        order_id: orderId,
        vendor_id: vendorId,
        status: status, // 'accepted', 'rejected', 'counter_offer'
        total_price: totalPrice,
        item_prices: itemPrices,
        estimated_ready_time: estimatedReadyTime,
        notes: notes
      })
      .select()
      .single()

    if (responseError) throw responseError

    // 2. Update order status (optional, depending on your flow)
    if (status === 'accepted') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          selected_vendor_id: vendorId,
          total_amount: totalPrice
        })
        .eq('id', orderId)

      if (orderError) throw orderError
    }

    console.log('✅ Vendor response saved to Supabase')

    return NextResponse.json({
      success: true,
      response: response
    })

  } catch (error) {
    console.error('❌ Error saving vendor response:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

---

## Step 6: Update Order Fetching API

If your vendor app has an API to fetch orders:

### New API Route:

```typescript
// vendor-app/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const vendorId = url.searchParams.get('vendorId')
    const status = url.searchParams.get('status') || 'pending_quotes'

    const supabase = getSupabaseClient()

    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    // If you want to filter by vendor (for orders already assigned)
    if (vendorId) {
      query = query.eq('selected_vendor_id', vendorId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      orders: data,
      count: data.length
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

---

## Step 7: Real-time Order Notifications

Create a hook for real-time order updates:

### `vendor-app/hooks/useVendorOrders.ts`:

```typescript
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface VendorOrder {
  id: string
  user_id: string
  status: string
  items: any[]
  route: any
  created_at: string
  total_amount?: number
}

export function useVendorOrders(status: string = 'pending_quotes') {
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Fetch initial orders
    fetchOrders()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('vendor-dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.${status}`
        },
        (payload) => {
          console.log('📦 Order update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New order added
            setOrders(prev => [payload.new as VendorOrder, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            // Order updated
            setOrders(prev =>
              prev.map(order =>
                order.id === payload.new.id ? (payload.new as VendorOrder) : order
              )
            )
          } else if (payload.eventType === 'DELETE') {
            // Order deleted
            setOrders(prev => prev.filter(order => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [status])

  async function fetchOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  return { orders, loading, refetch: fetchOrders }
}
```

**Usage in component:**

```typescript
import { useVendorOrders } from '@/hooks/useVendorOrders'

export default function VendorDashboard() {
  const { orders, loading } = useVendorOrders('pending_quotes')

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Pending Orders ({orders.length})</h1>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}
```

---

## Step 8: Test the Integration

### A. Test Order Fetching

1. Start vendor app: `npm run dev`
2. Visit vendor dashboard
3. You should see "0 pending orders" (empty for now)

### B. Create Test Order from User App

1. User app: Create a test order
2. Vendor app: Should see the order appear **immediately** (real-time!)

### C. Test Vendor Response

1. Vendor app: Accept or reject an order
2. User app: Should see the response **immediately**

---

## 📋 Migration Checklist

### Setup
- [ ] Install Supabase packages
- [ ] Copy Supabase client files
- [ ] Add environment variables (local)
- [ ] Add environment variables (Vercel)

### Code Updates
- [ ] Update dashboard to fetch from Supabase
- [ ] Add real-time subscriptions
- [ ] Update vendor response API
- [ ] Create order fetching API
- [ ] Update UI components

### Testing
- [ ] Vendor can see orders
- [ ] Real-time updates work
- [ ] Vendor can submit responses
- [ ] User sees vendor responses
- [ ] No errors in console

### Deployment
- [ ] Test locally
- [ ] Push to Git
- [ ] Deploy to Vercel
- [ ] Test production

---

## 🔧 Common Issues & Solutions

### "Supabase client not initialized"
**Solution:** Check that environment variables are set correctly in `.env.local`

### "Real-time not working"
**Solution:** 
1. Check Supabase Dashboard > Database > Replication
2. Ensure `supabase_realtime` publication includes `orders` table
3. Check browser console for WebSocket errors

### "Vendor response not saving"
**Solution:** 
1. Check service role key is set
2. Verify RLS policies allow inserts for service role
3. Check browser/server console for errors

---

## 🎯 Expected Behavior After Migration

1. **Vendor logs in** → Sees dashboard
2. **User creates order** → Appears **instantly** in vendor dashboard
3. **Vendor submits response** → Saves to Supabase
4. **User sees response** → Shows **instantly** in user app
5. **Both apps** → Connected via Supabase Realtime! 🎉

---

## 📊 Database Tables Used

### `orders` table
- Vendors read: `WHERE status = 'pending_quotes'`
- Vendors update: `selected_vendor_id`, `total_amount`, `status`

### `vendor_responses` table
- Vendors insert: New responses
- Users read: All responses for their orders

---

## 🚀 Deployment

### Local Testing
```bash
npm run dev
```

### Production Deployment
```bash
# Make sure Vercel env vars are set!
vercel --prod
```

### Verify Production
1. Visit vendor app URL
2. Check orders load from Supabase
3. Test creating order from user app
4. Confirm real-time updates work

---

## 💡 Pro Tips

1. **Keep service role key secret** - Never expose in client-side code
2. **Use connection pooling** - Supabase handles this automatically
3. **Monitor real-time connections** - Check Supabase Dashboard > Database > Realtime
4. **Log everything** - Use `console.log` to track data flow

---

## 📞 Need Help?

If you run into issues:
1. Check browser console for errors
2. Check Supabase Dashboard > Logs
3. Verify RLS policies in Supabase
4. Test queries in Supabase SQL Editor

---

**Ready to migrate your vendor app?** Start with Step 1! 🚀



