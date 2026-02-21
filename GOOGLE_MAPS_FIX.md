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

The `ApiTargetBlockedMapError` is typically caused by Google Cloud Console configuration issues. Check the following:

### 1. Enable Required APIs
In Google Cloud Console, ensure these APIs are enabled:
- **Maps JavaScript API**
- **Places API** (New)
- **Geocoding API** (for fallback)

### 2. Check API Key Restrictions
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Check **Application restrictions**:
   - If set to "HTTP referrers", ensure your domain is added:
     - `https://thru-landing-*.vercel.app/*`
     - `http://localhost:9002/*` (for local development)
   - Or temporarily set to "None" for testing
4. Check **API restrictions**:
   - Ensure "Maps JavaScript API" and "Places API" are allowed
   - Or set to "Don't restrict key" for testing

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
