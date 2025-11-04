# 🚀 Deploy Home Page Vendor Fix

## ✅ **What Was Fixed**

### **Problem:**
1. ❌ Old Firebase vendors (Hari Om Kirana, 8 Bit Bistro) showing on both pages
2. ❌ New Supabase vendors (Zeo's Pizza) NOT showing on home page

### **Solution:**
Updated `src/lib/route-based-shop-discovery.ts` to query **Supabase** instead of **Firebase**.

This automatically fixes BOTH pages:
- ✅ Home page (`/home`)
- ✅ Grocery page (`/grocery`)

---

## 📝 **Changes Made**

### **File:** `src/lib/route-based-shop-discovery.ts`

**Line 13:** Added Supabase import
```typescript
import { SupabaseVendorService } from './supabase/vendor-service'
```

**Lines 125-164:** Replaced `getAllShops()` method
- **Before:** Queried Firebase `vendors` collection
- **After:** Queries Supabase using `SupabaseVendorService.getActiveVendors()`

---

## 🚀 **How to Deploy**

### **Option 1: Deploy via Vercel Dashboard** (EASIEST)

Since you don't have a git remote configured yet:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: `thru-user-app`
3. Go to **Settings** → **Git**
4. Click **"Connect Git Repository"**
5. Connect to your GitHub/GitLab repo
6. Once connected, run:

```bash
git remote add origin <your-git-url>
git push -u origin master
```

### **Option 2: Manual File Upload** (QUICK FIX)

If you need to deploy immediately:

1. Go to Vercel Dashboard
2. Click your project
3. Click **"Deployments"**
4. Click **"Deploy"** → **"Import from Git"**
5. Or use Vercel CLI:

```bash
npm i -g vercel
vercel --prod
```

### **Option 3: Set Up Git Remote** (RECOMMENDED)

If you have a GitHub repo:

```bash
# Add your git remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push changes
git push -u origin master
```

Vercel will automatically deploy when you push.

---

## 🧪 **After Deployment - Testing**

### **Test 1: Check Home Page**

```bash
# Visit home page
https://app.kiptech.in/home

# Enter test route near Zeo's Pizza:
Start Location: 18.475, 73.860
Destination: 18.485, 73.870
Max Detour: 10 km

# Click "Food" tab
✅ Expected: See "Zeo's Pizza"
❌ Should NOT see: Old Firebase vendors
```

### **Test 2: Check Grocery Page**

```bash
# Visit grocery page
https://app.kiptech.in/grocery

# Enter same route
✅ Expected: See "Zeo's Pizza" (as cafe, not grocery)
❌ Should NOT see: "Hari Om Kirana Mart"
```

### **Test 3: Console Logs**

Open browser Developer Tools (F12) and check console:

```
Expected logs:
🔍 Fetching vendors from SUPABASE...
📊 Found X active vendors in Supabase
✅ Mapped X vendors with valid locations
```

---

## 🎯 **What This Achieves**

| Feature | Before | After |
|---------|--------|-------|
| **Data Source** | Firebase ❌ | Supabase ✅ |
| **Old Vendors** | Showing ❌ | Hidden ✅ |
| **New Vendors** | Missing ❌ | Showing ✅ |
| **Home Page** | Broken ❌ | Fixed ✅ |
| **Grocery Page** | Mixed data ❌ | Clean ✅ |

---

## ✅ **Verification Checklist**

After deployment:

- [ ] Home page loads without errors
- [ ] Zeo's Pizza appears on home page when route is set
- [ ] Grocery page shows Zeo's Pizza
- [ ] Old Firebase vendors are gone
- [ ] Console shows "Fetching vendors from SUPABASE"
- [ ] New vendor registrations automatically appear

---

## 🐛 **If Issues Occur**

### **Issue: Still seeing old vendors**

**Solution:** Clear browser cache
```javascript
// In browser console:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### **Issue: No vendors showing**

**Check:**
1. Supabase vendor is `is_active = true`
2. Vendor has `location` (not null)
3. Vendor has `grocery_enabled = true`

**SQL to verify:**
```sql
SELECT name, is_active, grocery_enabled, location
FROM vendors
WHERE name LIKE '%Zeo%';
```

### **Issue: Build errors**

Check Vercel deployment logs:
1. Go to Vercel Dashboard
2. Click **"Deployments"**
3. Click the latest deployment
4. Check build logs for errors

---

## 📊 **Summary**

**Status:** ✅ **CODE FIXED** (waiting for deployment)

**Files Changed:**
- `src/lib/route-based-shop-discovery.ts` ← Main fix
- `HOME_PAGE_VENDOR_FIX.md` ← Documentation
- `DEPLOY_HOME_PAGE_FIX.md` ← This file

**Next Step:** Deploy to Vercel using one of the options above.

**Result:** Both home and grocery pages will only show Supabase vendors!

---

## 💡 **Quick Deploy Command**

If you have Vercel CLI installed:

```bash
cd "F:\Cursor Projects\FirebaseImports\thru-user-app29082025-master\thru-user-app29082025-master"
vercel --prod
```

This will deploy immediately without needing git remote!

