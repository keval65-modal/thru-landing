# 🍕 Enable Zeo's Pizza for Grocery Orders

## ✅ Current Status

Zeo's Pizza **IS registered** in Supabase with:
- ✅ ID: `8c027b0f-394c-4c3e-a20c-56ad675366d2`
- ✅ Name: Zeo's Pizza
- ✅ Location: `[73.863038, 18.480321]` (Pune)
- ✅ Is Active: `true`

## ❌ Issues Preventing It from Showing

1. **`grocery_enabled: false`** ← Main blocker!
2. **`store_type: "cafe"`** should be `"grocery"`

---

## 🔧 Solution: Update in Supabase Dashboard

### **Method 1: Using Supabase SQL Editor** (Easiest)

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste this SQL:

```sql
UPDATE vendors
SET 
  grocery_enabled = true,
  store_type = 'grocery',
  updated_at = NOW()
WHERE id = '8c027b0f-394c-4c3e-a20c-56ad675366d2';
```

5. Click **Run**
6. You should see: `Success. Rows affected: 1`

---

### **Method 2: Using Table Editor** (Alternative)

1. Go to your Supabase Dashboard
2. Click on **Table Editor** in the left sidebar
3. Select the **`vendors`** table
4. Find the row with `name = "Zeo's Pizza"`
5. Click to edit the row
6. Update these fields:
   - `grocery_enabled`: Change to `true`
   - `store_type`: Change to `grocery`
7. Click **Save**

---

## ✅ Verify the Changes

After updating, verify with this curl command:

```bash
curl "https://app.kiptech.in/api/debug/supabase-vendors"
```

Look for:
```json
{
  "zeosPizza": {
    "name": "Zeo's Pizza",
    "groceryEnabled": true,  // ← Should be true now
    "storeType": "grocery",   // ← Should be grocery now
    "location": {...}
  }
}
```

---

## 🧪 Test the Fix

### **Step 1: Check Vendors**

```bash
node test-vendors-check.js
```

**Expected Output:**
```
✅ ZEO'S PIZZA FOUND!
   Grocery Enabled: ✅
   Store Type: grocery
   Location: 18.480321, 73.863038
```

### **Step 2: Test Order with Pune Coordinates**

```bash
node test-production-order.js
```

**Expected Output:**
```
{
  "vendorsFound": 1,  // ← Should be 1 now!
  "vendors": [
    {
      "name": "Zeo's Pizza",
      "location": {...}
    }
  ]
}
```

**Distance from test point:**
- Test point: `18.5204, 73.8567` (NIBM Road, Pune)
- Zeo's Pizza: `18.480321, 73.863038`
- **Distance: ~4.5 km** ← Within 5km detour!

---

## 📍 Route Testing Recommendations

Since Zeo's Pizza is in Pune at coordinates `18.480321, 73.863038`:

### **Test Route 1: Near Zeo's Pizza**
```json
{
  "startLocation": {
    "latitude": 18.475,
    "longitude": 73.860
  },
  "endLocation": {
    "latitude": 18.485,
    "longitude": 73.870
  },
  "detourPreferences": {
    "maxDetourKm": 10
  }
}
```

### **Test Route 2: Current Default Test**
```json
{
  "startLocation": {
    "latitude": 18.5204,  // NIBM Road
    "longitude": 73.8567
  },
  "endLocation": {
    "latitude": 18.5300,
    "longitude": 73.8700
  },
  "detourPreferences": {
    "maxDetourKm": 5  // Should work! (4.5km distance)
  }
}
```

---

## 🎯 Next Steps After Enabling

1. ✅ Update Zeo's Pizza in Supabase
2. ✅ Verify changes with debug endpoint
3. ✅ Test order with proper coordinates
4. ✅ Confirm vendor appears in search
5. ✅ Test order placement
6. ✅ Verify vendor receives notification

---

## 📊 Checklist for ANY Vendor to Show Up

For ANY vendor to appear in user searches, it MUST have:

- ✅ `is_active = true`
- ✅ `grocery_enabled = true` OR `store_type = 'grocery'`
- ✅ Valid `location` with coordinates
- ✅ Within `maxDetourKm` of user's route
- ✅ Location format properly converted (handled by code now)

---

## 🐛 Troubleshooting

### "Vendor still not showing"

**Check 1: Verify update was applied**
```bash
curl "https://app.kiptech.in/api/debug/supabase-vendors"
```

**Check 2: Test with correct coordinates**
- Use Pune coordinates (`18.48`, `73.86`)
- Don't use default test coordinates if they're too far

**Check 3: Check detour distance**
```javascript
// Calculate distance
const distance = calculateDistance(
  18.5204, 73.8567,  // Start point
  18.480321, 73.863038  // Zeo's Pizza
);
console.log(`Distance: ${distance.toFixed(2)} km`); // Should be ~4.5km
```

**Check 4: Verify location format**
- Old format (GeoJSON): `{"type": "Point", "coordinates": [lng, lat]}`
- New format (converted): `{"latitude": lat, "longitude": lng}`
- Code now handles both formats automatically

---

## 🚀 Quick Update Commands

### **Enable for Grocery:**
```sql
UPDATE vendors
SET grocery_enabled = true, store_type = 'grocery'
WHERE name = 'Zeo''s Pizza';
```

### **Check All Grocery Vendors:**
```sql
SELECT name, store_type, grocery_enabled, is_active, location
FROM vendors
WHERE grocery_enabled = true OR store_type = 'grocery';
```

### **Get All Vendors Near Pune:**
```sql
SELECT 
  name,
  store_type,
  grocery_enabled,
  ST_Distance(
    location::geography,
    ST_MakePoint(73.8567, 18.5204)::geography
  ) / 1000 as distance_km
FROM vendors
WHERE is_active = true
ORDER BY distance_km;
```

---

## 📞 Need Help?

If Zeo's Pizza still doesn't show up after these steps:

1. Check the Supabase dashboard to confirm the update
2. Run the debug endpoint to verify the data
3. Test with coordinates very close to Zeo's Pizza location
4. Check browser console for any errors
5. Verify the production deployment is complete

---

**Once enabled, Zeo's Pizza will appear in all grocery searches near Pune!** 🎉

