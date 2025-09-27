# 🛒 Advanced Grocery Shopping System

## Overview

This advanced grocery shopping system provides a complete solution for route-based grocery ordering with real-time vendor notifications, inventory checking, and multi-shop selection. The system integrates with Google Maps for route planning and Firebase for real-time data management.

## Features

### 🗺️ Route Planning
- **Google Maps Integration**: Interactive map with Places API autocomplete
- **Detour Tolerance**: Configurable detour distance (0.5km to 5km)
- **Transport Modes**: Driving, walking, and public transit support
- **Real-time Route Calculation**: Live route updates with distance and time estimates
- **Location Tracking**: GPS-based current location detection

### 🏪 Shop Discovery & Selection
- **Route-based Shop Finding**: Automatically finds shops along user's route
- **Multi-shop Selection**: Support for ordering from multiple shops
- **Real-time Inventory Checking**: Live stock availability verification
- **Shop Comparison**: Side-by-side comparison of shops with pricing and availability
- **Interactive Map**: Visual shop selection with markers and route visualization

### 📱 Order Management
- **Advanced Order Placement**: Route-optimized order processing
- **Vendor Notifications**: Real-time push notifications to vendors
- **Response Tracking**: Monitor vendor response times and acceptance rates
- **Order Status Tracking**: Live order status updates with progress indicators
- **Location Sharing**: Real-time location tracking for order pickup

### 🔔 Vendor Notifications
- **Push Notifications**: Firebase Cloud Messaging integration
- **Response Timeout**: 5-minute timeout for vendor responses
- **Auto-selection**: Automatic selection of fastest responding vendor
- **Inventory Validation**: Real-time stock checking before sending notifications
- **Multi-vendor Handling**: Simultaneous notifications to multiple vendors

## Architecture

### Data Structures

#### UserRouteData
```typescript
interface UserRouteData {
  start: { latitude: number; longitude: number; address: string; timestamp: number }
  destination: { latitude: number; longitude: number; address: string; estimatedArrival: number }
  detourTolerance: number // 0.5 to 5 km
  routePolyline: string // Google Maps encoded polyline
  totalDistance: number // in kilometers
  estimatedDuration: number // in minutes
  transportMode: 'driving' | 'walking' | 'transit'
  currentLocation?: { latitude: number; longitude: number; timestamp: number }
}
```

#### AdvancedOrderData
```typescript
interface AdvancedOrderData {
  userId: string
  userInfo: { name: string; phone: string; email?: string }
  items: Array<{ product: ProductInfo; quantity: number; totalPrice: number }>
  userRoute: UserRouteData
  orderPreferences: {
    allowMultiShop: boolean
    maxShops: number
    priority: 'speed' | 'price' | 'distance'
    allowSubstitutions: boolean
  }
  selectedShops?: string[]
  totalAmount: number
  status: 'pending' | 'accepted' | 'multi_shop_selection' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

#### ShopRouteData
```typescript
interface ShopRouteData {
  id: string
  shopName: string
  location: { latitude: number; longitude: number; address: string }
  routeInfo: {
    distanceFromRoute: number
    detourDistance: number
    estimatedTime: number
    routePosition: number
  }
  availability: {
    hasAllItems: boolean
    missingItems: string[]
    availableItems: Array<{ productId: string; quantity: number; price: number }>
    estimatedPreparationTime: number
  }
  pricing: { totalPrice: number; itemCount: number; averageItemPrice: number }
  metadata: { rating?: number; isOpen: boolean; phone?: string; lastUpdated: Timestamp }
}
```

### Components

#### 1. RoutePlanner
- **Purpose**: Route planning with Google Maps integration
- **Features**: Address autocomplete, detour tolerance slider, transport mode selection
- **Location**: `src/components/RoutePlanner.tsx`

#### 2. ShopSelectionMap
- **Purpose**: Interactive map for shop selection
- **Features**: Multi-select markers, route visualization, detour area display
- **Location**: `src/components/ShopSelectionMap.tsx`

#### 3. ShopComparison
- **Purpose**: Side-by-side shop comparison
- **Features**: Item availability matrix, price comparison, rating display
- **Location**: `src/components/ShopComparison.tsx`

#### 4. OrderStatusTracker
- **Purpose**: Real-time order tracking
- **Features**: Progress timeline, location tracking, vendor contact
- **Location**: `src/components/OrderStatusTracker.tsx`

#### 5. VendorNotificationHandler
- **Purpose**: Vendor response management
- **Features**: Response tracking, timeout handling, auto-selection
- **Location**: `src/components/VendorNotificationHandler.tsx`

### Services

#### 1. AdvancedGroceryService
- **Purpose**: Core grocery service with route optimization
- **Features**: Shop discovery, order placement, real-time updates
- **Location**: `src/lib/advanced-grocery-service.ts`

#### 2. InventoryCheckService
- **Purpose**: Inventory validation and stock checking
- **Features**: Real-time stock levels, availability checking, price validation
- **Location**: `src/lib/inventory-check-service.ts`

#### 3. FCMService
- **Purpose**: Firebase Cloud Messaging for notifications
- **Features**: Push notifications, token management, background handling
- **Location**: `src/lib/fcm-service.ts`

### Hooks

#### useAdvancedGroceryShopping
- **Purpose**: Main hook for grocery shopping state management
- **Features**: Cart management, route handling, order placement, real-time updates
- **Location**: `src/hooks/useAdvancedGroceryShopping.ts`

## User Experience Flow

### 1. Route Planning
1. User opens grocery page
2. Sets start and destination addresses
3. Configures detour tolerance (0.5km to 5km)
4. Selects transport mode (driving/walking/transit)
5. System calculates optimal route

### 2. Product Shopping
1. User browses and adds items to cart
2. Real-time product updates from Firestore
3. Cart management with quantity controls
4. Proceed to shop selection

### 3. Shop Discovery
1. System finds shops along user's route
2. Checks inventory availability for each shop
3. Displays shops on interactive map
4. Shows detour distances and times

### 4. Shop Selection
1. User selects preferred shop(s) or system auto-selects
2. Multi-shop selection if needed
3. Price and availability comparison
4. Confirm selection

### 5. Order Placement
1. Order sent to selected shop(s)
2. Real-time vendor notifications sent
3. Inventory validation performed
4. Vendor response tracking begins

### 6. Vendor Response Handling
1. Vendors receive push notifications
2. Real-time response tracking
3. Auto-selection of fastest responding vendor
4. Rejection handling for unavailable items

### 7. Order Tracking
1. Live updates on order status
2. Vendor response times display
3. Location sharing for pickup
4. Preparation progress updates

## Technical Implementation

### Google Maps Integration

#### Required APIs
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API

#### Map Features
- Route visualization with polylines
- Shop markers with custom icons
- Detour area visualization
- Click handlers for shop selection
- Info windows with shop details
- Real-time location tracking

### Firebase Integration

#### Collections
- `grocery-skus`: Product catalog
- `vendors`: Shop information
- `grocery-orders`: Order data
- `vendor-responses`: Vendor response tracking
- `shop-inventory`: Real-time inventory data

#### Real-time Features
- Live product updates
- Order status tracking
- Vendor response monitoring
- Inventory availability updates
- Location tracking

### Push Notifications

#### FCM Setup
- Service worker for background notifications
- Token management and refresh
- Notification click handling
- Background message processing

#### Notification Types
- Order acceptance/rejection
- Order ready notifications
- Status updates
- Vendor responses

## Environment Variables

```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# FCM
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
1. Copy `env-template.txt` to `.env.local`
2. Add your Google Maps API key
3. Add your Firebase configuration
4. Add FCM VAPID key

### 3. Firebase Setup
1. Enable Firestore
2. Set up security rules
3. Configure FCM
4. Set up collections

### 4. Google Maps Setup
1. Enable required APIs
2. Set up API restrictions
3. Configure billing

### 5. Deploy
```bash
npm run build
npm run start
```

## Testing

### Functionality Tests
- [ ] Route planning works correctly
- [ ] Shop discovery finds shops on route
- [ ] Multi-shop selection functions properly
- [ ] Order placement works correctly
- [ ] Real-time updates function properly

### User Experience Tests
- [ ] Location services work correctly
- [ ] Map interactions are smooth
- [ ] Order flow is intuitive
- [ ] Mobile experience is optimized

### Integration Tests
- [ ] Firebase connection works
- [ ] Google Maps integration functions
- [ ] Real-time listeners work properly
- [ ] Error handling works gracefully

## Security Considerations

### Input Validation
- Validate all user inputs
- Sanitize address inputs
- Validate location coordinates
- Check order data integrity

### Location Privacy
- Handle location data securely
- Implement proper consent mechanisms
- Follow privacy regulations
- Secure location storage

### Authentication
- Use proper Firebase authentication
- Validate user permissions
- Secure API endpoints
- Implement proper session management

### Data Protection
- Encrypt sensitive data
- Follow GDPR compliance
- Implement data retention policies
- Secure vendor communications

## Performance Optimization

### Map Performance
- Optimize marker rendering
- Implement clustering for large datasets
- Use efficient polyline rendering
- Minimize API calls

### Real-time Updates
- Implement efficient listeners
- Use proper cleanup mechanisms
- Optimize data structures
- Minimize unnecessary updates

### Mobile Optimization
- Touch-friendly interactions
- Responsive design
- Offline capabilities
- Fast loading times

## Error Handling

### Network Errors
- Route calculation failures
- Shop availability check failures
- Order placement failures
- Real-time update failures

### Location Errors
- Geolocation permission denied
- Location accuracy issues
- Network connectivity problems
- GPS signal loss

### Order Errors
- No shops found on route
- Vendor response timeouts
- Payment processing failures
- Item availability changes

## Future Enhancements

### Advanced Features
- Machine learning for route optimization
- Predictive inventory management
- Dynamic pricing based on demand
- AI-powered shop recommendations

### Integration Features
- Payment gateway integration
- Loyalty program integration
- Social sharing features
- Multi-language support

### Analytics Features
- User behavior tracking
- Order analytics
- Vendor performance metrics
- Route optimization insights

## Support

For technical support or questions about the advanced grocery shopping system, please refer to the main project documentation or contact the development team.

## License

This project is part of the main application and follows the same licensing terms.
