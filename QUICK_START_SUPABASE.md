# 🚀 Quick Start: Firebase to Supabase Migration

This guide will help you migrate from Firebase to Supabase in **30 minutes**.

---

## Step 1: Create Supabase Project (5 minutes)

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Project Name: `thru-app`
   - Database Password: (save this!)
   - Region: Choose closest to your users
5. Wait for project to be created (~2 minutes)

---

## Step 2: Run Database Schema (3 minutes)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success" message

✅ Your database tables are now created!

---

## Step 3: Get Supabase Credentials (2 minutes)

1. In Supabase Dashboard, go to **Settings** > **API**
2. Copy these values:
   - Project URL
   - `anon` `public` key
   - `service_role` key (⚠️ Keep this secret!)

---

## Step 4: Update Environment Variables (3 minutes)

### For Local Development

Update your `.env.local` file (for running locally):

```env
# ============================================
# KEEP FIREBASE (for Phone OTP only)
# ============================================
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# For migration script and admin operations
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"

# ============================================
# ADD SUPABASE (for Database & Real-time)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# OTHER SERVICES
# ============================================
NEXT_PUBLIC_VENDOR_API_URL=https://thru-vendor-dashboard-adb8o00cx-keval65-modals-projects.vercel.app/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### For Production (Vercel)

**Important:** Also add these to Vercel for production!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add **ALL** the variables above (both Firebase and Supabase)
5. Make sure to select all environments: **Production**, **Preview**, **Development**

💡 **Pro Tip:** You can add them now or wait until you're ready to deploy. But don't forget!

---

## Step 5: Install Dependencies (2 minutes)

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `tsx` - TypeScript executor for migration script

---

## Step 6: Migrate Existing Data (5 minutes)

⚠️ **Important:** This will copy all your Firebase data to Supabase.

```bash
npm run migrate:firebase-to-supabase
```

You'll see output like:
```
🚀 Firebase to Supabase Migration
==================================
📦 Migrating vendors...
   Found 15 vendors in Firestore
   ✅ Successfully migrated 15 vendors

📦 Migrating users...
   Found 23 users in Firestore
   ✅ Successfully migrated 23 users

📦 Migrating orders...
   Found 47 orders in Firestore
   ✅ Successfully migrated 47 orders

🔍 Verifying migration...
   Vendors: Firestore 15 → Supabase 15
   Orders: Firestore 47 → Supabase 47
   Users: Firestore 23 → Supabase 23

✅ Migration completed successfully in 4.32s!
```

---

## Step 7: Test Supabase Connection (2 minutes)

Create a test API route to verify connection:

```bash
# Create test file
mkdir -p src/app/api/test-supabase
```

Create `src/app/api/test-supabase/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error, count } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful! 🎉',
      vendorCount: count,
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

Test it:
```bash
npm run dev
```

Visit: `http://localhost:9002/api/test-supabase`

You should see:
```json
{
  "success": true,
  "message": "Supabase connection successful! 🎉",
  "vendorCount": 15,
  "timestamp": "2025-11-03T..."
}
```

✅ **Supabase is working!**

---

## Step 8: Update Your Code (Gradually)

Now you'll update your code to use Supabase instead of Firestore.

### Option A: Use New Services (Recommended)

The migration guide has created new service files that use Supabase:
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client
- See `SUPABASE_MIGRATION_GUIDE.md` for complete service implementations

### Option B: Update Existing Services

Update your existing services one by one:

1. **Order Service** - Replace Firestore with Supabase
2. **Vendor Service** - Replace Firestore with Supabase  
3. **Real-time Listeners** - Replace Firebase listeners with Supabase Realtime
4. **Push Notifications** - Replace FCM with alternative

See the detailed guide in `SUPABASE_MIGRATION_GUIDE.md`.

---

## Step 9: Test Everything (5 minutes)

Test these features:

- [ ] Phone OTP login (Firebase - should still work)
- [ ] Create new order (Supabase)
- [ ] View orders (Supabase)
- [ ] Real-time order updates (Supabase Realtime)
- [ ] Vendor discovery (Supabase + PostGIS)

---

## Step 10: Deploy to Vercel (3 minutes)

1. **Add environment variables to Vercel** (if you haven't already from Step 4):
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to **Settings** > **Environment Variables**
   - Click **Add New**
   - Add each variable from Step 4:
     - All Firebase variables (for Phone OTP)
     - All Supabase variables (for database)
     - Other variables (Google Maps, Vendor API)
   - Select all environments: Production, Preview, Development
   - Click **Save**

2. Deploy:
```bash
vercel --prod
```

3. Test production deployment

---

## 🎉 You're Done!

Your app now uses:
- ✅ **Firebase** - Phone OTP authentication (working, no changes)
- ✅ **Supabase** - Database, Real-time updates, and everything else
- ✅ **Better Performance** - PostgreSQL is faster than Firestore for complex queries
- ✅ **Lower Cost** - Supabase free tier is very generous

---

## Troubleshooting

### "Firebase Admin credentials not available"
- Make sure `FIREBASE_PRIVATE_KEY` is in your `.env.local`
- Ensure it's properly escaped with `\n` for newlines

### "Supabase connection failed"
- Check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure you copied them correctly from Supabase Dashboard

### "Migration script fails"
- Check that the SQL schema was run successfully
- Verify all environment variables are set
- Try running the script again (it's safe to run multiple times)

### "Real-time not working"
- Go to Supabase Dashboard > Database > Replication
- Ensure `supabase_realtime` publication includes your tables
- Check browser console for WebSocket errors

---

## Next Steps

1. Read the full migration guide: `SUPABASE_MIGRATION_GUIDE.md`
2. Update your API routes to use Supabase
3. Test thoroughly in development
4. Deploy to production
5. Monitor for any issues

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

