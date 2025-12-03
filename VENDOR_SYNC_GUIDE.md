# 🔄 Vendor Database Sync Guide

## Problem
Your **vendor app** saves vendors to **Supabase**, but your **user app** queries vendors from **Firebase**.

This means vendors you add in the vendor app won't show up in the user app!

## Solution Options

### Option 1: Update User App to Use Supabase (Recommended)

This is the permanent fix. Update the user app's order API to query from Supabase instead of Firebase.

**File to update:** `src/app/api/grocery/order/route.ts`

**Current code (lines 54-59):**
```typescript
// Find vendors along the route
const vendorsSnapshot = await db.collection('vendors').get();
const allVendors = vendorsSnapshot.docs.map((doc: any) => ({
  id: doc.id,
  ...doc.data()
}));
```

**Replace with:**
```typescript
// Import at the top of the file
import { SupabaseVendorService } from '@/lib/supabase/vendor-service';

// Find vendors along the route (using Supabase)
const allVendors = await SupabaseVendorService.getActiveVendors({
  storeType: 'grocery'
});

console.log(`📊 Found ${allVendors.length} vendors from Supabase`);
```

**Also update the filtering logic (lines 67-99):**
```typescript
// Filter vendors within detour distance
const routeVendors = allVendors.filter((vendor: any) => {
  if (!vendor.location || !vendor.location.latitude || !vendor.location.longitude) {
    console.log(`❌ Vendor ${vendor.id} has no location data`);
    return false;
  }

  const distanceToStart = calculateDistance(
    orderData.route.startLocation.latitude,
    orderData.route.startLocation.longitude,
    vendor.location.latitude,
    vendor.location.longitude
  );

  const distanceToEnd = calculateDistance(
    orderData.route.endLocation.latitude,
    orderData.route.endLocation.longitude,
    vendor.location.latitude,
    vendor.location.longitude
  );

  const maxDetour = orderData.detourPreferences.maxDetourKm;
  const isWithinRange = distanceToStart <= maxDetour || distanceToEnd <= maxDetour;
  
  console.log(`📍 Vendor ${vendor.id} (${vendor.name || 'No name'}):`);
  console.log(`   Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
  console.log(`   Distance to start: ${distanceToStart.toFixed(2)}km`);
  console.log(`   Distance to end: ${distanceToEnd.toFixed(2)}km`);
  console.log(`   Max detour: ${maxDetour}km`);
  console.log(`   Within range: ${isWithinRange}`);

  return isWithinRange;
});
```

---

### Option 2: Sync Vendors to Firebase (Quick Fix)

If you want to keep using Firebase for now, sync your Supabase vendors to Firebase.

#### Manual Sync Steps:

1. **Get your cafe details from Supabase:**
   - Go to your Supabase dashboard
   - Open the `vendors` table
   - Find your cafe entry
   - Note down all the details

2. **Add to Firebase:**
   - Go to Firebase Console
   - Open Firestore Database
   - Create/update in `vendors` collection
   - Add your cafe with these fields:

```javascript
{
  name: "Your Cafe Name",
  email: "cafe@example.com",
  phone: "+1234567890",
  address: "123 Main St, City",
  location: {
    latitude: 18.5204,  // Your cafe's coordinates
    longitude: 73.8567
  },
  storeCategory: "grocery",  // Important!
  storeType: "grocery",
  categories: ["grocery", "cafe"],
  groceryEnabled: true,      // Must be true!
  isActive: true,
  isActiveOnThru: true,
  operatingHours: {
    monday: { open: "09:00", close: "18:00" },
    tuesday: { open: "09:00", close: "18:00" },
    // ... add other days
  },
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

### Option 3: Automated Sync Script

If you have many vendors, use the sync script I created.

**Prerequisites:**
1. Set up environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Run the sync:
```bash
# Check both databases
node check-databases.js

# Sync all vendors
node sync-vendor-to-firebase.js all

# Or sync one vendor
node sync-vendor-to-firebase.js one <vendor-id>
```

---

## Testing After Fix

Once you've applied a fix, test your orders:

1. **Check vendors are visible:**
   ```bash
   curl https://app.kiptech.in/api/debug/vendors
   ```

2. **Place a test order:**
   - Go to: `http://localhost:3000/grocery`
   - Set route with your cafe nearby
   - Add items to cart
   - Place order
   - Check if vendors are found in console logs

3. **Verify in logs:**
   - Should see: `🛒 Found X grocery-enabled vendors`
   - Should see: `📍 Found X vendors along route`
   - `vendorsFound` should be > 0

---

## Quick Checklist

For a vendor to show up in user app, it MUST have:

- ✅ `groceryEnabled: true` OR `storeCategory: "grocery"`
- ✅ Valid `location` with `latitude` and `longitude`
- ✅ `isActive: true`
- ✅ Within detour distance from user's route

---

## Need Help?

If you're still having issues:

1. Check browser console for errors
2. Check server logs for vendor queries
3. Verify your cafe's location coordinates
4. Ensure max detour distance is reasonable (5-10km)
5. Test with different start/end locations

---

## Recommended Approach

**For Production:** Use Option 1 (Update to Supabase) ✅

**For Quick Testing:** Use Option 2 (Manual Firebase entry) 🔧

**For Many Vendors:** Use Option 3 (Automated sync) 🤖















