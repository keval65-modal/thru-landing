# 🛒 Production Order Flow

## Overview

This document describes the **production-ready order flow** where users place orders and vendors quote prices.

---

## 📋 **The Flow**

### **Step 1: User Creates Order**

**User Action:**
- Plans route (start → destination)
- Searches for grocery items
- Adds items to cart (without prices yet!)
- Places order

**Data Saved:**
```typescript
{
  userId: "actual_user_id",
  items: [
    { id: "item1", name: "Tomatoes", quantity: 2, unit: "kg" },
    { id: "item2", name: "Milk", quantity: 1, unit: "liter" }
  ],
  route: {
    startLocation: { lat, lng, address },
    endLocation: { lat, lng, address }
  },
  detourPreferences: {
    maxDetourKm: 5,
    maxDetourMinutes: 15
  },
  status: "pending_quotes", // NEW: Waiting for vendor quotes
  createdAt: timestamp
}
```

---

### **Step 2: System Finds Vendors**

**System Action:**
- Find all vendors along the route (within detour tolerance)
- Filter by:
  - Active vendors
  - Grocery-enabled
  - Currently open (operating hours)
  - Within delivery radius

**Notify Vendors:**
- Send order to each vendor's notification queue
- Vendors see: items, quantities, customer route, pickup time

---

### **Step 3: Vendors Quote Prices**

**Vendor Action:**
- Reviews order items
- Checks inventory
- Quotes price for each item they have
- Specifies items they can't fulfill
- Adds preparation time

**Vendor Response:**
```typescript
{
  orderId: "order123",
  vendorId: "vendor_abc",
  vendorName: "Fresh Mart",
  status: "quoted", // NEW: Not just accept/reject
  itemQuotes: [
    {
      itemId: "item1",
      available: true,
      pricePerUnit: 45, // Vendor's price
      quantity: 2,
      totalPrice: 90
    },
    {
      itemId: "item2",
      available: true,
      pricePerUnit: 65,
      quantity: 1,
      totalPrice: 65
    }
  ],
  unavailableItems: [], // Items vendor doesn't have
  totalPrice: 155, // Sum of all items
  estimatedReadyTime: "30 minutes",
  notes: "Fresh items, ready for pickup",
  respondedAt: timestamp
}
```

---

### **Step 4: User Sees All Quotes**

**User Sees:**
```
Order: 2kg Tomatoes, 1L Milk

Quotes Received (3):

┌─────────────────────────────────────┐
│ Fresh Mart                    ₹155  │
│ • 2kg Tomatoes: ₹90                 │
│ • 1L Milk: ₹65                      │
│ • Ready in: 30 min                  │
│ • Detour: 0.5km                     │
│ [Select This Vendor]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Quick Grocery                 ₹170  │
│ • 2kg Tomatoes: ₹100                │
│ • 1L Milk: ₹70                      │
│ • Ready in: 20 min                  │
│ • Detour: 1.2km                     │
│ [Select This Vendor]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Budget Store                  ₹140  │
│ • 2kg Tomatoes: ₹75                 │
│ • 1L Milk: ₹65                      │
│ • Ready in: 45 min                  │
│ • Detour: 2.1km                     │
│ [Select This Vendor]          ⭐ Best│
└─────────────────────────────────────┘
```

**User Can:**
- Compare prices
- See detour distances
- Check preparation times
- Select best option

---

### **Step 5: User Selects Vendor**

**User Action:**
- Clicks "Select This Vendor"
- Confirms order

**System Updates:**
```typescript
{
  orderId: "order123",
  status: "confirmed", // Order confirmed
  selectedVendorId: "vendor_abc",
  selectedVendorName: "Budget Store",
  finalPrice: 140,
  selectedQuote: { ...vendor quote... },
  confirmedAt: timestamp
}
```

**Notifications:**
- ✅ Selected vendor: "Order confirmed! Prepare items"
- ❌ Other vendors: "Order was fulfilled by another vendor"

---

### **Step 6: Order Fulfillment**

**Vendor Updates Status:**
- `preparing` → Vendor is preparing items
- `ready` → Items ready for pickup
- `picked_up` → Customer collected items
- `completed` → Order complete

**User Tracking:**
- Real-time status updates
- Estimated pickup time
- Navigation to vendor
- Arrival notifications

---

## 🔄 **Status Progression**

```
User Side:
pending_quotes → quotes_received → confirmed → picked_up → completed
     ↓              ↓                 ↓           ↓            ↓
   created    vendors quote    user selects  at vendor    done

Vendor Side:
new_order → quoted → confirmed → preparing → ready → completed
    ↓         ↓          ↓          ↓         ↓         ↓
  notified  sent quote  accepted  working   ready    done
```

---

## 📊 **Key Differences from Test Flow**

| Aspect | Test Flow | Production Flow |
|--------|-----------|-----------------|
| **Vendor Response** | Accept/Reject | Quote with prices |
| **User Decision** | Automatic | User selects best quote |
| **Pricing** | Fixed/Unknown | Vendor-specific quotes |
| **Items** | All or nothing | Partial fulfillment possible |
| **Competition** | Single vendor | Multiple vendors compete |

---

## 🎯 **Benefits**

### **For Users:**
- ✅ **Price transparency** - See all options
- ✅ **Choice** - Select best price/time/location
- ✅ **Flexibility** - Multiple vendors compete
- ✅ **No surprises** - Know exact price before confirming

### **For Vendors:**
- ✅ **Fair competition** - Best service wins
- ✅ **Flexibility** - Quote based on inventory
- ✅ **Control** - Set own prices
- ✅ **Partial fulfillment** - Can quote subset of items

### **For Platform:**
- ✅ **Marketplace** - Creates competition
- ✅ **Better prices** - Vendors compete on price
- ✅ **Higher conversion** - User has options
- ✅ **Trust** - Transparent pricing

---

## 🚀 **Implementation TODO**

### **User App:**
- [ ] Update order creation to support "pending_quotes" status
- [ ] Create quote comparison UI
- [ ] Add vendor selection flow
- [ ] Show real-time quote updates
- [ ] Implement quote timeout (e.g., 5 minutes)

### **Vendor App:**
- [ ] Update order response to include item-by-item pricing
- [ ] Allow partial fulfillment (quote subset of items)
- [ ] Add pricing input UI
- [ ] Show inventory availability
- [ ] Quick quote templates for common items

### **Both Apps:**
- [ ] Update Firestore schema for quotes
- [ ] Real-time quote notifications
- [ ] Quote comparison logic
- [ ] Order confirmation flow
- [ ] Status update system

---

## 📝 **Next Steps**

1. ✅ Clean up test data
2. 🔧 Update order schema
3. 🎨 Build quote comparison UI
4. 📱 Update vendor quote input
5. 🧪 Test end-to-end flow
6. 🚀 Deploy to production

---

**Status**: 📝 Design Complete - Ready for Implementation



