# 🔐 Environment Variables Setup Guide

This guide explains how to set up environment variables for both local development and production deployment.

---

## 📍 Two Places to Set Variables

| Location | Purpose | When to Use |
|----------|---------|-------------|
| **`.env.local`** | Local development | Running `npm run dev` on your machine |
| **Vercel Dashboard** | Production deployment | Deployed app on Vercel |

⚠️ **Important:** You need to set variables in **BOTH** places!

---

## 🏠 Local Development Setup (.env.local)

### Step 1: Create/Edit .env.local

In your project root, create or edit `.env.local`:

```bash
# If file doesn't exist, create it
touch .env.local  # Mac/Linux
# or
echo. > .env.local  # Windows
```

### Step 2: Add All Variables

Copy and paste this template, then fill in your actual values:

```env
# ============================================
# FIREBASE (Keep for Phone OTP)
# ============================================
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (for migration script and server-side operations)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# ============================================
# SUPABASE (New - Add these)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key

# ============================================
# OPTIONAL: OneSignal (for push notifications)
# ============================================
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id

# ============================================
# OTHER SERVICES
# ============================================
NEXT_PUBLIC_VENDOR_API_URL=https://thru-vendor-dashboard-adb8o00cx-keval65-modals-projects.vercel.app/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Step 3: Save and Test

```bash
# Restart your dev server to pick up changes
npm run dev

# Test that variables are loaded
# Visit: http://localhost:9002/api/test-supabase
```

---

## 🚀 Production Setup (Vercel)

### Step 1: Go to Vercel Dashboard

1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sign in to your account
3. Select your project (thru-user-app)

### Step 2: Navigate to Environment Variables

1. Click on **Settings** tab
2. Click on **Environment Variables** in the left sidebar

### Step 3: Add Each Variable

For **EACH** variable from `.env.local`, do this:

1. Click **Add New** button
2. Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (your actual value)
4. Select environments:
   - ✅ **Production** (always check this)
   - ✅ **Preview** (for preview deployments)
   - ✅ **Development** (for Vercel development)
5. Click **Save**

### Step 4: Add All Variables

Add these variables to Vercel:

#### Firebase Variables (Keep these)
```
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

#### Supabase Variables (New)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

#### Optional Variables
```
NEXT_PUBLIC_ONESIGNAL_APP_ID (if using OneSignal)
```

#### Other Services
```
NEXT_PUBLIC_VENDOR_API_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

### Step 5: Redeploy (if already deployed)

If your app is already deployed, you need to redeploy for changes to take effect:

```bash
vercel --prod
```

Or trigger a redeploy from Vercel Dashboard:
1. Go to **Deployments** tab
2. Click the **...** menu on latest deployment
3. Click **Redeploy**

---

## 🔍 Vercel Environment Variables - Visual Guide

### Adding a Single Variable

```
┌─────────────────────────────────────────┐
│ Environment Variables                    │
├─────────────────────────────────────────┤
│                                          │
│ Key                                      │
│ ┌─────────────────────────────────────┐ │
│ │ NEXT_PUBLIC_SUPABASE_URL            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Value                                    │
│ ┌─────────────────────────────────────┐ │
│ │ https://abc123.supabase.co          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Environments                             │
│ ☑ Production                            │
│ ☑ Preview                               │
│ ☑ Development                           │
│                                          │
│ [Save]                                   │
└─────────────────────────────────────────┘
```

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Keep `.env.local` in `.gitignore` (never commit it)
- ✅ Use `NEXT_PUBLIC_` prefix for client-side variables
- ✅ Keep service role keys secret (no `NEXT_PUBLIC_` prefix)
- ✅ Regularly rotate sensitive keys
- ✅ Use different keys for development and production

### ❌ DON'T:
- ❌ Never commit `.env.local` to Git
- ❌ Don't share service role keys publicly
- ❌ Don't use production keys in development
- ❌ Don't expose sensitive keys in client-side code

---

## 🔑 Understanding Variable Prefixes

### `NEXT_PUBLIC_` Variables
```typescript
// These are exposed to the browser (client-side)
// Anyone can see them in the browser's dev tools
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (safe to expose)
```

**Use for:** Frontend code, public APIs, anon keys

### Non-Prefixed Variables
```typescript
// These are server-side only
// Never exposed to the browser
SUPABASE_SERVICE_ROLE_KEY=eyJ... (keep secret!)
FIREBASE_PRIVATE_KEY=-----BEGIN... (keep secret!)
```

**Use for:** Server API routes, admin operations, sensitive keys

---

## 🧪 Testing Your Setup

### Local Development Test

```bash
# Start dev server
npm run dev

# In your browser console:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Should show: "https://your-project.supabase.co"

# Server-side test (in API route):
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)
// Should show your service role key (server-side only)
```

### Production Test

After deploying to Vercel:

```bash
# Check logs in Vercel Dashboard
# Go to: Deployments > Latest > Functions > View Logs

# Or test via API:
curl https://your-app.vercel.app/api/test-supabase
```

---

## 🆘 Troubleshooting

### "Environment variable not found"

**Problem:** Variable shows as `undefined`

**Solutions:**
1. Check spelling (case-sensitive!)
2. Restart dev server after changes
3. Verify variable is in `.env.local`
4. For Vercel, verify variable is saved in dashboard

### "Supabase connection failed"

**Problem:** Can't connect to Supabase

**Solutions:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
3. Check for extra spaces or quotes
4. Ensure Supabase project is active

### "Firebase Admin error"

**Problem:** Firebase Admin SDK not initializing

**Solutions:**
1. Check `FIREBASE_PRIVATE_KEY` has proper line breaks (`\n`)
2. Ensure key is wrapped in quotes
3. Verify all three Firebase Admin vars are set:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

### Variables not working on Vercel

**Problem:** Works locally but not on Vercel

**Solutions:**
1. Double-check all variables are added in Vercel Dashboard
2. Ensure environments are selected (Production, Preview, Development)
3. Redeploy after adding variables
4. Check deployment logs for errors

---

## 📋 Checklist

### Local Development
- [ ] `.env.local` file exists
- [ ] All Firebase variables added
- [ ] All Supabase variables added
- [ ] Other variables added (Google Maps, etc.)
- [ ] Dev server restarted
- [ ] Test API route works

### Vercel Production
- [ ] Logged into Vercel Dashboard
- [ ] Project selected
- [ ] All Firebase variables added to Vercel
- [ ] All Supabase variables added to Vercel
- [ ] All environments selected
- [ ] All variables saved
- [ ] App redeployed
- [ ] Production API tested

---

## 💡 Pro Tips

### Tip 1: Copy from Supabase Dashboard
Instead of manually typing, copy directly from Supabase:
1. Go to Supabase Dashboard > Settings > API
2. Click "Copy" button next to each value
3. Paste directly into `.env.local` or Vercel

### Tip 2: Use Vercel CLI
Add variables via command line:

```bash
# Install Vercel CLI
npm install -g vercel

# Add variable
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Then paste the value when prompted
```

### Tip 3: Sync Between Environments
Use the same variable names in both places to avoid confusion.

### Tip 4: Keep a Template
Save a copy of your `.env.local` as `.env.template` (with fake values) and commit it to Git as documentation.

---

## 🎯 Quick Reference

| Variable | Required? | Where? | Prefix? |
|----------|-----------|--------|---------|
| NEXT_PUBLIC_FIREBASE_* | ✅ Yes | Both | ✅ Yes |
| FIREBASE_PRIVATE_KEY | ✅ Yes | Both | ❌ No |
| NEXT_PUBLIC_SUPABASE_* | ✅ Yes | Both | ✅ Yes |
| SUPABASE_SERVICE_ROLE_KEY | ✅ Yes | Both | ❌ No |
| NEXT_PUBLIC_ONESIGNAL_* | ⚪ Optional | Both | ✅ Yes |
| NEXT_PUBLIC_GOOGLE_MAPS_* | ✅ Yes | Both | ✅ Yes |

---

**Remember:** Variables in `.env.local` are for development, variables in Vercel are for production. Set both! 🎯



