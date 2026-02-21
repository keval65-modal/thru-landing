# Google Maps Places API Fix

## Issues Fixed

1. **Script Loading Pattern**: Updated to use `loading=async` and `lazyOnload` strategy for better performance
2. **Script Loading Detection**: Added proper waiting mechanism to ensure Google Maps script is fully loaded before initializing autocomplete
3. **Error Handling**: Improved error handling for Places API initialization failures
4. **Fallback Geocoding**: Added fallback to geocode manually entered addresses if autocomplete fails

## Code Changes

### 1. Layout (`src/app/layout.tsx`)
- Changed script loading from `beforeInteractive` to `lazyOnload`
- Added `loading=async` parameter to the Google Maps script URL

### 2. Form Components
- Added `mapsLoaded` state to track when Google Maps is ready
- Added polling mechanism to wait for script to load (with 10s timeout)
- Added try-catch blocks around autocomplete initialization
- Added fallback geocoding for manual address entry

## Resolving ApiTargetBlockedMapError

The `ApiTargetBlockedMapError` can be caused by several issues. If your domain (`thrulife.in`) is already in the Website restrictions, check the following:

### 1. Enable Required APIs
In Google Cloud Console, ensure these APIs are enabled:
- **Maps JavaScript API**
- **Places API** (New)
- **Geocoding API** (for fallback)

### 2. Check API Key Restrictions
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Check **Website restrictions** (Application restrictions):
   - If set to "HTTP referrers", ensure your domain is added:
     - `https://thrulife.in/*` ✅ (already added)
     - `https://www.thrulife.in/*` (add if you use www subdomain)
     - `http://localhost:9002/*` (for local development)
     - `http://localhost:*/*` (for any local port)
   - **Note**: Make sure the pattern matches exactly - use `https://thrulife.in/*` (with trailing slash and wildcard)
4. Check **API restrictions**:
   - Ensure "Maps JavaScript API" and "Places API" are allowed
   - Your current setup looks correct (5 APIs enabled including Places API)

### 2b. Common Issues When Domain IS in Restrictions
If `thrulife.in` is already in your restrictions but you still get the error:
1. **Check the exact pattern**: Ensure it's `https://thrulife.in/*` (not `thrulife.in` without protocol)
2. **Wait for propagation**: Changes can take up to 5 minutes
3. **Clear browser cache**: The error might be cached
4. **Check for www subdomain**: If you access via `www.thrulife.in`, add that pattern too
5. **Script loading**: Ensure the script loads with proper referrer headers (fixed in code)

### 3. Verify Billing
- Ensure billing is enabled for your Google Cloud project
- Places API requires a billing account (though it has a free tier)

### 4. Check Quotas
- Go to APIs & Services → Dashboard
- Check if you've exceeded any quotas for Places API

## Testing

After fixing the API key configuration:

1. Clear browser cache and reload the page
2. Open browser console to check for errors
3. Try typing in the location field - you should see autocomplete suggestions
4. If autocomplete doesn't work, you can still manually enter an address and it will be geocoded on submit

## Notes

- The deprecated `Autocomplete` API is still being used (as recommended by Google for existing implementations)
- Google recommends migrating to `PlaceAutocompleteElement` in the future, but it's not required yet
- The current implementation will continue to work with proper API key configuration
