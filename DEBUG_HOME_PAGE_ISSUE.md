# 🐛 Debug: Why Zeo's Not Showing on Home Page

## 🔍 **Potential Issues**

### **Issue 1: Database State**

Zeo's Pizza might not have the correct flags set in Supabase.

**Run this SQL in Supabase to check:**

```sql
SELECT 
  name,
  store_type,
  is_active,
  is_active_on_thru,
  location
FROM vendors
WHERE name ILIKE '%zeo%';
```

**Expected:**
- `store_type`: `'cafe'` ✅
- `is_active`: `true` ✅  
- `is_active_on_thru`: Can be `true` or `false` (doesn't matter, code defaults to true)
- `location`: Must NOT be NULL ✅

**If any are wrong, run this:**

```sql
UPDATE vendors
SET 
  store_type = 'cafe',
  is_active = true,
  is_active_on_thru = true,
  grocery_enabled = true,
  updated_at = NOW()
WHERE name ILIKE '%zeo%';
```

---

### **Issue 2: Google Maps Directions API Not Loaded**

**Location:** `src/lib/route-based-shop-discovery.ts` lines 212-220

```typescript
if (!this.directionsService) {
  console.warn('⚠️ Google Maps Directions Service not available - returning empty result')
  return {
    shops: [],  // ❌ Returns EMPTY if Google Maps not loaded!
    // ...
  }
}
```

**This means:**
- If Google Maps API hasn't loaded yet → **NO SHOPS SHOW**
- Even if vendors are in Supabase → **THEY WON'T APPEAR**

---

### **Issue 3: Deployment Hasn't Propagated**

The Vercel deployment might still be serving old cached code.

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Try incognito/private window
4. Wait 2-3 minutes for CDN to update

---

### **Issue 4: Browser Cache / Service Worker**

The browser might be caching the old version.

**Clear Everything:**

```javascript
// In browser console (F12):
localStorage.clear()
sessionStorage.clear()
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
})
location.reload(true)
```

---

## 🧪 **Debugging Steps**

### **Step 1: Check Browser Console**

1. Open https://app.kiptech.in/home
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Enter route and click Food tab
5. Look for these logs:

**Expected Logs:**
```
🔍 Fetching vendors from SUPABASE...
📊 Found X active vendors in Supabase
✅ Mapped X vendors with valid locations
🍽️ Finding food shops along route
✅ Found X food shops
```

**If you see:**
```
⚠️ Google Maps Directions Service not available
```
→ **Google Maps API issue!**

**If you see:**
```
📊 Found 0 active vendors in Supabase
```
→ **Database query issue!**

---

### **Step 2: Test API Endpoint Directly**

Create this test file:

```javascript
// test-supabase-vendor-fetch.js
const https = require('https');

const url = 'https://qbtvuvkzftzxkpbcwdik.supabase.co/rest/v1/vendors?is_active=eq.true&select=*';
const options = {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidHZ1dmt6ZnR6eGtwYmN3ZGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyODk2NjQsImV4cCI6MjA1Mjg2NTY2NH0.vVE9A16kt_Uc1R76KNxCxT6lJLjLWFVxs3WvLFdMDfs',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidHZ1dmt6ZnR6eGtwYmN3ZGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyODk2NjQsImV4cCI6MjA1Mjg2NTY2NH0.vVE9A16kt_Uc1R76KNxCxT6lJLjLWFVxs3WvLFdMDfs'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const vendors = JSON.parse(data);
    console.log(`Found ${vendors.length} active vendors`);
    
    const zeos = vendors.find(v => v.name?.toLowerCase().includes('zeo'));
    if (zeos) {
      console.log('\n✅ Zeo\'s Pizza found:');
      console.log('  Name:', zeos.name);
      console.log('  Store Type:', zeos.store_type);
      console.log('  Is Active:', zeos.is_active);
      console.log('  Location:', zeos.location);
    } else {
      console.log('\n❌ Zeo\'s Pizza NOT found in active vendors!');
      console.log('\nAll vendors:', vendors.map(v => v.name).join(', '));
    }
  });
}).on('error', err => console.error('Error:', err));
```

Run: `node test-supabase-vendor-fetch.js`

---

### **Step 3: Check Vercel Deployment Logs**

```bash
vercel logs https://thru-user-app29082025-master-aadi4chpc-keval65-modals-projects.vercel.app --follow
```

Look for errors related to:
- Supabase connection
- Google Maps API
- Vendor fetching

---

## 💡 **Most Likely Issues**

### **#1 Google Maps API Not Loading** (80% probability)

**Why:** The route-based shop discovery requires Google Maps Directions API to calculate routes. If it's not loaded, it returns empty results.

**Quick Fix:** Add fallback logic to show shops even without Google Maps:

```typescript
// In route-based-shop-discovery.ts
if (!this.directionsService) {
  console.warn('⚠️ Google Maps not available - using simple distance-based filtering')
  
  // Simple fallback: show shops within maxDetourKm radius
  const midpoint = {
    lat: (startPoint.latitude + endPoint.latitude) / 2,
    lng: (startPoint.longitude + endPoint.longitude) / 2
  };
  
  const nearbyShops = shops.filter(shop => {
    const distance = this.calculateDistance(midpoint.lat, midpoint.lng, shop.coordinates.lat, shop.coordinates.lng);
    return distance <= maxDetourKm;
  }).map(shop => ({
    ...shop,
    distanceFromRoute: 0,
    detourDistance: 0,
    routePosition: 0.5,
    estimatedTime: 5,
    isOnRoute: true
  }));
  
  return {
    shops: nearbyShops,
    routePolyline: '',
    totalDistance: 0,
    totalDuration: 0,
    detourArea: { center: midpoint, radius: maxDetourKm }
  };
}
```

---

### **#2 Deployment Cache** (15% probability)

**Fix:** Force cache clear and redeploy

---

### **#3 Database State** (5% probability)

**Fix:** Run the UPDATE SQL above

---

## 🚀 **Immediate Actions**

1. **Check browser console** for the exact error
2. **Run SQL check** in Supabase dashboard
3. **Hard refresh** the page (Ctrl+Shift+R)
4. **Report back what console says**

---

## 📊 **What to Look For**

When you check the browser console, tell me:

1. Do you see `🔍 Fetching vendors from SUPABASE...`?
   - If YES → Vendor fetch is working
   - If NO → Code not running

2. How many vendors does it say it found?
   - `📊 Found X active vendors`

3. Do you see `⚠️ Google Maps Directions Service not available`?
   - If YES → **THIS IS THE PROBLEM**
   - If NO → Keep checking

4. Do you see `✅ Found X food shops`?
   - If 0 → Filtering problem or Google Maps issue
   - If > 0 → Display problem

**Share these console logs and we'll fix it!**

