# Google Maps API Key Troubleshooting for ApiTargetBlockedMapError

## Quick Check List

If you're getting `ApiTargetBlockedMapError` on `thrulife.in`, verify these in Google Cloud Console:

### 1. Exact Pattern Matching

In Google Cloud Console → APIs & Services → Credentials → Your API Key → Website restrictions:

**Required patterns (add ALL that apply):**
- `https://thrulife.in/*` ✅ (must include `https://` and `/*`)
- `https://www.thrulife.in/*` (if you use www subdomain)
- `http://thrulife.in/*` (if you allow HTTP, though not recommended)

**Common mistakes:**
- ❌ `thrulife.in` (missing protocol and wildcard)
- ❌ `thrulife.in/*` (missing protocol)
- ❌ `https://thrulife.in` (missing wildcard)
- ✅ `https://thrulife.in/*` (correct)

### 2. Verify Current Domain

Open browser console on your live site and run:
```javascript
console.log('Current URL:', window.location.href);
console.log('Current Origin:', window.location.origin);
console.log('Current Hostname:', window.location.hostname);
```

The hostname should match exactly what's in your restrictions (e.g., `thrulife.in` or `www.thrulife.in`).

### 3. Check for Redirects

If your site redirects (e.g., `http://` to `https://` or `www` to non-www), make sure BOTH patterns are in the restrictions.

### 4. Wait for Propagation

After updating restrictions:
- Wait 2-5 minutes
- Clear browser cache completely
- Try incognito/private window
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### 5. Test Script Loading

Check browser Network tab:
1. Open DevTools → Network tab
2. Filter by "maps.googleapis.com"
3. Check the request headers
4. Look for `Referer` header - it should be `https://thrulife.in/...`
5. If Referer is missing or different, that's the issue

### 6. Alternative: Temporarily Remove Restrictions

For testing only:
1. Set Website restrictions to "None"
2. Test if Maps works
3. If it works, the issue is definitely the pattern matching
4. Add back restrictions with correct patterns

## Debug Information

The code now includes debug logging. Check browser console for:
- Current URL
- Document referrer
- Google Maps availability

## Still Not Working?

If the error persists after checking all above:

1. **Verify API Key is correct**: Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable matches the key in Google Cloud Console

2. **Check API Restrictions**: Ensure these APIs are enabled:
   - Maps JavaScript API
   - Places API
   - Places API (New)
   - Geocoding API

3. **Check Billing**: Places API requires billing to be enabled (though has free tier)

4. **Check Quotas**: Go to APIs & Services → Dashboard and verify you haven't exceeded quotas

5. **Try Different Browser**: Rule out browser-specific issues

6. **Check for Ad Blockers**: Some ad blockers interfere with Google Maps
