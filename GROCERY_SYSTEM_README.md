# Grocery Shopping System

A complete grocery shopping system for the consumer app that allows users to browse products from the global grocery database, find nearby shops, and place orders.

## Features

### 🔍 Product Search
- Fuzzy search with debounced input
- Real-time product results
- Category filtering
- Product images and details
- Price display

### 🗺️ Shop Discovery
- Interactive Google Maps integration
- Route visualization between user location and destination
- Shop markers on map with real-time selection
- Distance and rating information
- Detour area calculation

### 🛒 Shopping Cart
- Add/remove/update product quantities
- Real-time price calculations
- Shop selection validation
- Order placement with loading states

### 📱 User Experience
- Step-by-step shopping flow
- Progress indicators
- Mobile-optimized design
- Error handling and loading states
- Order confirmation and tracking

## System Architecture

### Data Flow
1. **Consumer App** → **Grocery API** → **grocery-skus collection** (product catalog)
2. **Consumer App** → **Shops API** → **vendors collection** (shop discovery)
3. **Consumer App** → **Orders API** → **orders collection** (order management)

### API Endpoints
- `GET /api/grocery/products?search=onion&limit=20` - Search products with fuzzy matching
- `GET /api/grocery/shops?lat=28.6139&lng=77.2090&maxDetour=2` - Find nearby shops
- `POST /api/grocery/orders` - Place grocery orders
- `GET /api/grocery/orders?userId=user123&status=pending` - Get user orders

## Components

### Core Components
- **GrocerySearch** - Product search and browsing
- **PathBasedShopDiscovery** - Map-based shop discovery
- **ShoppingCart** - Cart management and order placement
- **DestinationSelector** - Destination input and geocoding
- **OrderConfirmation** - Order success confirmation

### Custom Hooks
- **useGroceryCart** - Cart state management
- **useLocation** - Location services and geocoding

### API Service
- **GroceryAPI** - Centralized API service for all grocery operations

## Setup Instructions

### 1. Environment Variables

#### For Local Development:
Copy `env-template.txt` to `.env.local` and fill in your values:
```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Vendor API URL
NEXT_PUBLIC_VENDOR_API_URL=https://thru-vendor-dashboard-8ckxjtfqj-keval65-modals-projects.vercel.app
```

#### For Vercel Deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the variables with their production values
3. Redeploy your application

**Note:** `.env.local` is in `.gitignore` and should NOT be uploaded to git or Vercel.

### 2. Google Maps Setup
1. Get a Google Maps API key from Google Cloud Console
2. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
3. Add the API key to your environment variables

### 3. Navigation
The grocery shopping feature is accessible via:
- Bottom navigation: "Grocery" tab
- Direct URL: `/grocery`
- Test page: `/grocery/test`

## User Flow

### 1. Location Setup
- User allows location access
- System gets current location and address
- Shows location confirmation

### 2. Destination Entry
- User enters destination address
- System geocodes destination
- Validates address and shows confirmation

### 3. Shop Discovery
- System calculates route between current location and destination
- Shows interactive map with route
- Displays shops within detour area
- User selects preferred shop

### 4. Product Shopping
- User searches for products using fuzzy search
- Browses product catalog with filtering
- Adds items to cart with quantity management
- Reviews cart and shop selection

### 5. Order Placement
- User confirms order details
- System places order with selected shop
- Shows order confirmation with tracking ID
- Option to place another order

## Testing

### Manual Testing
1. Visit `/grocery/test` to test API endpoints
2. Test product search functionality
3. Test shop discovery with different locations
4. Test complete order flow

### API Testing Checklist
- [ ] Product search returns correct results
- [ ] Shop discovery finds nearby shops
- [ ] Order placement works correctly
- [ ] Error handling works properly

### User Experience Testing
- [ ] Location services work correctly
- [ ] Search is responsive and accurate
- [ ] Cart management works smoothly
- [ ] Order flow is intuitive

### Mobile Testing
- [ ] Works on various screen sizes
- [ ] Touch interactions are smooth
- [ ] Performance is acceptable
- [ ] Maps load correctly

## Security Considerations

- **Input Validation**: All user inputs are validated
- **Location Privacy**: Location data is handled securely
- **API Security**: Proper authentication and CORS configuration
- **Data Protection**: Follows privacy regulations

## Performance Optimizations

- **Debounced Search**: Prevents excessive API calls
- **Lazy Loading**: Components load as needed
- **Image Optimization**: Product images are optimized
- **Caching**: API responses are cached where appropriate

## Error Handling

- **Network Errors**: Graceful handling of API failures
- **Location Errors**: Clear error messages for location issues
- **Validation Errors**: Input validation with user feedback
- **Loading States**: Proper loading indicators throughout

## Future Enhancements

- **Offline Support**: Basic offline functionality
- **Push Notifications**: Order status updates
- **Favorites**: Save frequently ordered items
- **Reviews**: Shop and product reviews
- **Recommendations**: AI-powered product recommendations

## Troubleshooting

### Common Issues

1. **Maps not loading**
   - Check Google Maps API key
   - Verify API restrictions
   - Check browser console for errors

2. **Location not working**
   - Ensure HTTPS (required for geolocation)
   - Check browser permissions
   - Verify location services are enabled

3. **API calls failing**
   - Check network connectivity
   - Verify API endpoint URLs
   - Check CORS configuration

4. **Products not found**
   - Verify search terms
   - Check API response format
   - Ensure database has data

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API test page at `/grocery/test`
3. Check browser console for errors
4. Verify environment variables are set correctly
