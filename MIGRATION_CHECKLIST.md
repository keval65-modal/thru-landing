# ✅ Firebase to Supabase Migration Checklist

Use this checklist to track your migration progress. Simply check off items as you complete them.

---

## Phase 1: Setup (15 minutes)

### Supabase Project Setup
- [ ] Go to https://supabase.com and create an account
- [ ] Click "New Project"
- [ ] Name: `thru-app` (or your preferred name)
- [ ] Set database password (save this!)
- [ ] Choose region closest to your users
- [ ] Wait for project creation (~2 minutes)

### Get Credentials
- [ ] Go to Settings > API in Supabase Dashboard
- [ ] Copy Project URL → Save to notepad
- [ ] Copy `anon` `public` key → Save to notepad
- [ ] Copy `service_role` key → Save to notepad (keep secret!)

### Run Database Schema
- [ ] Go to SQL Editor in Supabase Dashboard
- [ ] Click "New Query"
- [ ] Open `supabase-schema.sql` from your project
- [ ] Copy all contents
- [ ] Paste into SQL Editor
- [ ] Click "Run" (Ctrl+Enter)
- [ ] Verify you see "Success" message
- [ ] Check Database > Tables shows: orders, vendors, vendor_responses, user_profiles

---

## Phase 2: Local Setup (5 minutes)

### Environment Variables
- [ ] Open `.env.local` in your project
- [ ] Add these new variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```
- [ ] Keep existing Firebase variables (for Phone OTP)
- [ ] Save the file

### Install Dependencies
- [ ] Open terminal in project directory
- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Verify no errors

---

## Phase 3: Data Migration (10 minutes)

### Prepare Migration
- [ ] Ensure Firebase Admin credentials are in `.env.local`:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- [ ] Backup your Firebase data (optional but recommended)

### Run Migration Script
- [ ] Run: `npm run migrate:firebase-to-supabase`
- [ ] Wait for script to complete
- [ ] Verify output shows:
  - ✅ Vendors migrated
  - ✅ Users migrated
  - ✅ Orders migrated
  - ✅ Verification passed

### Verify in Supabase
- [ ] Go to Supabase Dashboard > Table Editor
- [ ] Check `vendors` table has data
- [ ] Check `user_profiles` table has data
- [ ] Check `orders` table has data
- [ ] Compare counts with Firebase Console

---

## Phase 4: Test Connection (5 minutes)

### Create Test API Route
- [ ] Create file: `src/app/api/test-supabase/route.ts`
- [ ] Copy code from `QUICK_START_SUPABASE.md` (Step 7)
- [ ] Save file

### Test Connection
- [ ] Run: `npm run dev`
- [ ] Visit: `http://localhost:9002/api/test-supabase`
- [ ] Verify response shows:
  - `"success": true`
  - `"vendorCount": <number>`
- [ ] If error, check environment variables

---

## Phase 5: Code Migration (Ongoing)

### Update API Routes (Do these one by one)

#### Test Vendors API
- [ ] Update `src/app/api/test-vendors-v4/route.ts`
  - [ ] Import: `import { SupabaseVendorService } from '@/lib/supabase/vendor-service'`
  - [ ] Replace Firestore calls with Supabase calls
  - [ ] Test the endpoint

#### Orders API
- [ ] Update `src/app/api/orders/create/route.ts`
  - [ ] Import: `import { SupabaseOrderService } from '@/lib/supabase/order-service'`
  - [ ] Replace Firestore calls
  - [ ] Test order creation

#### Vendor Responses API
- [ ] Update `src/app/api/vendor-responses/route.ts`
  - [ ] Use Supabase client
  - [ ] Test vendor response handling

### Update Hooks

#### Order Listener Hook
- [ ] Update `src/hooks/useOrderListener.ts`
  - [ ] Import: `import { supabaseRealtimeService } from '@/lib/supabase/realtime-service'`
  - [ ] Replace Firebase listeners with Supabase Realtime
  - [ ] Test real-time updates

#### Grocery Cart Hook
- [ ] Update `src/hooks/useGroceryCartFirestore.ts`
  - [ ] Keep Firebase Auth check
  - [ ] Use Supabase for data persistence
  - [ ] Test cart operations

### Update Pages (Test each after updating)

#### Orders Page
- [ ] Update `src/app/orders/page.tsx`
  - [ ] Use `SupabaseOrderService`
  - [ ] Test order list display
  - [ ] Test order details

#### Order Tracking Page
- [ ] Update `src/app/order-tracking/[orderId]/page.tsx`
  - [ ] Use Supabase Realtime
  - [ ] Test live updates

#### Grocery Page
- [ ] Update `src/app/grocery/page.tsx`
  - [ ] Use `SupabaseVendorService`
  - [ ] Test vendor search
  - [ ] Test location-based search

---

## Phase 6: Push Notifications (Optional)

### Option A: OneSignal (Recommended)
- [ ] Create account at https://onesignal.com
- [ ] Create new app
- [ ] Get App ID
- [ ] Add to `.env.local`: `NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id`
- [ ] Install: `npm install react-onesignal`
- [ ] Initialize in app layout
- [ ] Test notifications

### Option B: Web Push API
- [ ] Use `WebPushNotificationService` from `notification-service.ts`
- [ ] Request permission
- [ ] Test local notifications

### Option C: Supabase Edge Functions
- [ ] Create Edge Function in Supabase Dashboard
- [ ] Deploy notification logic
- [ ] Test via API

---

## Phase 7: Testing (30 minutes)

### Authentication (Should still work with Firebase)
- [ ] Test phone number input
- [ ] Test OTP send
- [ ] Test OTP verification
- [ ] Test login success
- [ ] Test logout

### Orders Flow
- [ ] Test create new order
- [ ] Test view orders list
- [ ] Test order details page
- [ ] Test order status updates (real-time)
- [ ] Test vendor responses (real-time)

### Vendor Discovery
- [ ] Test vendor list
- [ ] Test vendor search
- [ ] Test location-based search
- [ ] Test store type filtering
- [ ] Test distance calculations

### Edge Cases
- [ ] Test with no internet (offline behavior)
- [ ] Test with slow connection
- [ ] Test with many concurrent users
- [ ] Test with large dataset

---

## Phase 8: Deployment (10 minutes)

### Vercel Setup
- [ ] Go to Vercel Dashboard
- [ ] Select your project
- [ ] Go to Settings > Environment Variables
- [ ] Add all environment variables from `.env.local`:
  - [ ] All Firebase variables (for Phone OTP)
  - [ ] All Supabase variables
  - [ ] Other variables (Google Maps, etc.)

### Deploy
- [ ] Run: `vercel --prod`
- [ ] Wait for deployment
- [ ] Verify deployment success
- [ ] Get production URL

### Production Testing
- [ ] Test production URL
- [ ] Test phone OTP on production
- [ ] Test order creation on production
- [ ] Test real-time updates on production
- [ ] Test vendor discovery on production

---

## Phase 9: Monitoring (Ongoing)

### Supabase Dashboard
- [ ] Monitor Database > Table Editor regularly
- [ ] Check Database > Database size
- [ ] Review API > Logs for errors
- [ ] Monitor Performance > Query Performance

### Application Monitoring
- [ ] Check Vercel Analytics
- [ ] Monitor error rates
- [ ] Review response times
- [ ] Check user feedback

### Performance Optimization
- [ ] Add database indexes if needed
- [ ] Optimize slow queries
- [ ] Enable caching where appropriate
- [ ] Review and adjust RLS policies

---

## Phase 10: Cleanup (Optional)

### After Successful Migration
- [ ] Monitor production for 1-2 weeks
- [ ] Verify everything works correctly
- [ ] Keep Firebase Auth (still needed for Phone OTP)
- [ ] Consider reducing Firebase plan (if only using Auth)
- [ ] Archive old Firebase data (optional)

### Documentation
- [ ] Update team documentation
- [ ] Document new environment variables
- [ ] Update deployment guide
- [ ] Train team on Supabase dashboard

---

## 🆘 If Something Goes Wrong

### Quick Rollback
1. Revert code changes: `git revert <commit>`
2. Redeploy: `vercel --prod`
3. Firebase data is still intact
4. No data loss!

### Get Help
- Check `SUPABASE_MIGRATION_GUIDE.md` for detailed troubleshooting
- Check Supabase Discord: https://discord.supabase.com
- Review Supabase Docs: https://supabase.com/docs

---

## 📊 Migration Progress

**Total Tasks**: 93
**Completed**: ___
**Remaining**: ___
**Progress**: ___%

---

## 🎉 You Did It!

Once all tasks are checked:
- ✅ Firebase Auth (Phone OTP) - Still working
- ✅ Database - Migrated to Supabase PostgreSQL
- ✅ Real-time - Using Supabase Realtime
- ✅ Geospatial - Using PostGIS
- ✅ Notifications - Using alternative service
- ✅ Performance - Improved
- ✅ Costs - Reduced

**Congratulations on completing the migration! 🚀**

---

## 💾 Save This Checklist

Print this or keep it open in a tab. Check off items as you go. Good luck! 🍀

















