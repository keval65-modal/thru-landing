# 🔥 Firestore Real-Time Communication System

## Overview

This system replaces HTTP webhooks with **Firestore real-time listeners** for communication between the user app and vendor app. This provides:

✅ **Real-time updates** - No polling, instant notifications  
✅ **Reliability** - No network failures, retries handled by Firebase  
✅ **Simplicity** - No CORS issues, no webhook configuration  
✅ **Cost-effective** - Fewer API calls, leveraging Firebase's infrastructure  

---

## Architecture

### Before (HTTP Webhooks - ❌ REMOVED)
```
User App → Creates Order → Firestore
                              ↓
                    Vendor App reads order
                              ↓
                    Vendor accepts/rejects
                              ↓
                    HTTP POST to User App ❌ (Could fail!)
                              ↓
                    User App updates UI
```

### After (Firestore Real-Time - ✅ CURRENT)
```
User App → Creates Order → Firestore (groceryOrders collection)
                              ↓
                    Vendor App listens (real-time)
                              ↓
                    Vendor accepts/rejects → Updates Firestore
                              ↓
                    User App listens (real-time) ✅ (Always works!)
                              ↓
                    User App updates UI instantly
```

---

## Collections Structure

### 1. `groceryOrders` Collection
Stores all grocery orders from users.

**Document Structure:**
```typescript
{
  userId: string
  items: Array<{
    id: string
    name: string
    quantity: number
    unit: string
  }>
  route: {
    startLocation: {
      latitude: number
      longitude: number
      address: string
    }
    endLocation: {
      latitude: number
      longitude: number
      address: string
    }
  }
  status: 'pending' | 'vendor_accepted' | 'vendor_rejected' | 'counter_offer_received'
  vendorResponses: {
    [vendorId: string]: {
      status: 'accepted' | 'rejected' | 'counter_offer'
      totalPrice?: number
      estimatedReadyTime?: string
      notes?: string
      respondedAt: Date
    }
  }
  createdAt: Date
  updatedAt: Date
}
```

### 2. `vendor_responses` Collection
Stores individual vendor responses (for audit trail and detailed tracking).

**Document Structure:**
```typescript
{
  orderId: string
  vendorId: string
  vendorName: string
  status: 'accepted' | 'rejected' | 'counter_offer'
  responseTime: string (ISO format)
  items: Array<any>
  totalPrice: number
  estimatedReadyTime: string
  notes: string
  counterOffer: any
  createdAt: Date
  updatedAt: Date
}
```

---

## User App Implementation

### 1. Using the Hook (Recommended)

```typescript
import { useOrderListener } from '@/hooks/useOrderListener'

function OrderTracking({ orderId }: { orderId: string }) {
  const { order, vendorResponses, loading, error } = useOrderListener(orderId)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Order Status: {order?.status}</h2>
      
      {vendorResponses.map(response => (
        <div key={response.vendorId}>
          {response.vendorName}: {response.status}
          {response.status === 'accepted' && (
            <p>Ready in: {response.estimatedReadyTime}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

### 2. Using the Service Directly

```typescript
import { orderListenerService } from '@/lib/order-listener-service'

// Subscribe to order updates
const unsubscribe = orderListenerService.subscribeToOrder(
  orderId,
  (order) => {
    console.log('Order updated:', order)
    // Update your UI here
  },
  (error) => {
    console.error('Error:', error)
  }
)

// Clean up when component unmounts
return () => unsubscribe()
```

### 3. Listen to All User Orders

```typescript
import { useUserOrders } from '@/hooks/useOrderListener'

function MyOrders({ userId }: { userId: string }) {
  const { orders, loading } = useUserOrders(userId, {
    status: 'pending', // Optional filter
    limit: 10 // Optional limit
  })

  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.orderId} order={order} />
      ))}
    </div>
  )
}
```

---

## Vendor App Implementation

### When Vendor Accepts/Rejects Order

**File**: `app/api/vendor-responses/route.ts`

```typescript
export async function POST(request: Request) {
  const { orderId, vendorId, vendorName, status, totalPrice, estimatedReadyTime, notes } = await request.json()

  // 1. Save to vendor_responses collection (audit trail)
  await adminDb.collection('vendor_responses').add({
    orderId,
    vendorId,
    vendorName,
    status,
    totalPrice,
    estimatedReadyTime,
    notes,
    responseTime: new Date().toISOString(),
    createdAt: new Date()
  })

  // 2. Update the groceryOrders document
  await adminDb.collection('groceryOrders').doc(orderId).update({
    status: status === 'accepted' ? 'vendor_accepted' : 'vendor_rejected',
    [`vendorResponses.${vendorId}`]: {
      status,
      totalPrice,
      estimatedReadyTime,
      notes,
      respondedAt: new Date()
    },
    updatedAt: new Date()
  })

  // ✅ That's it! No HTTP calls needed.
  // User app will be notified automatically via real-time listeners
  
  return NextResponse.json({ success: true })
}
```

---

## Toast Notifications

The system automatically shows toast notifications when:

- ✅ Vendor accepts order → "Order Accepted! 🎉"
- ❌ Vendor rejects order → "Order Update"
- 💰 Counter offer received → "Counter Offer Received"

Customize in `hooks/useOrderListener.ts`:

```typescript
if (response.status === 'accepted') {
  toast({
    title: `${response.vendorName} Accepted! ✅`,
    description: `Ready in ${response.estimatedReadyTime}`,
  })
}
```

---

## Firestore Security Rules

Ensure these rules are set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Grocery Orders - Users can read their own, vendors can read assigned orders
    match /groceryOrders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role == 'vendor');
      
      allow create: if request.auth != null;
      
      allow update: if request.auth != null && 
        (request.auth.token.role == 'vendor' || 
         resource.data.userId == request.auth.uid);
    }
    
    // Vendor Responses - Users and vendors can read
    match /vendor_responses/{responseId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.token.role == 'vendor';
    }
  }
}
```

---

## Testing the Flow

### 1. Create an Order (User App)

```bash
curl -X POST http://localhost:3000/api/grocery/order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "items": [
      {"id": "1", "name": "Tomatoes", "quantity": 2, "unit": "kg"}
    ],
    "route": {
      "startLocation": {"latitude": 18.52, "longitude": 73.85},
      "endLocation": {"latitude": 18.53, "longitude": 73.87}
    }
  }'
```

### 2. Vendor Accepts Order (Vendor App)

```bash
curl -X POST https://merchant.kiptech.in/api/vendor-responses \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID_FROM_STEP_1",
    "vendorId": "vendor_123",
    "vendorName": "Fresh Grocers",
    "status": "accepted",
    "totalPrice": 100,
    "estimatedReadyTime": "30 minutes",
    "notes": "Order will be ready soon"
  }'
```

### 3. Check User App

Open the order tracking page - you'll see the status update **instantly** without refreshing!

---

## Debugging

### Check Firestore Console

1. Go to Firebase Console → Firestore Database
2. Check `groceryOrders` collection → Find your order
3. Check `vendor_responses` collection → See all responses

### Console Logs

**User App:**
```
📦 Order update received: { orderId: "...", status: "vendor_accepted", ... }
📨 Vendor response received: { vendorId: "vendor_123", status: "accepted", ... }
```

**Vendor App:**
```
✅ Vendor response saved with ID: ABC123
✅ Order XYZ789 updated in Firestore with status: vendor_accepted
📢 Vendor response saved to Firestore - User app will be notified via real-time listeners
```

### Common Issues

**Issue**: Order status not updating
- **Fix**: Check collection name - should be `groceryOrders` not `orders`
- **Fix**: Verify Firestore rules allow updates

**Issue**: No vendor responses showing
- **Fix**: Check `vendor_responses` collection exists
- **Fix**: Verify orderId matches exactly

**Issue**: Real-time listener not working
- **Fix**: Check Firebase initialization in browser console
- **Fix**: Verify internet connection
- **Fix**: Check browser console for Firebase errors

---

## Performance Considerations

- **Real-time listeners** are very efficient - Firebase handles connection pooling
- **Firestore pricing**: ~$0.06 per 100,000 document reads (real-time listeners count as 1 read)
- **Network**: Uses WebSocket connection, very low latency (~50-200ms)
- **Battery**: More efficient than polling, listeners only active when needed

---

## Migration Checklist

- [x] Remove HTTP webhook calls from vendor app
- [x] Update vendor app to write directly to Firestore
- [x] Fix collection name mismatch (orders → groceryOrders)
- [x] Add real-time listeners in user app
- [x] Create reusable hooks and services
- [x] Add toast notifications
- [x] Create example components
- [x] Write documentation

---

## Next Steps

1. **Deploy vendor app** with updated code (no HTTP calls)
2. **Deploy user app** with new listeners
3. **Test end-to-end** flow
4. **Monitor** Firestore usage in Firebase Console
5. **Add analytics** to track response times

---

## Support

For issues or questions:
- Check Firebase Console for errors
- Review browser console logs
- Verify Firestore security rules
- Test with Firebase Emulator locally

---

**Status**: ✅ **Fully Implemented** - Ready for deployment!



