# Backend Vendor Integration Requirements

## Overview
This document outlines the backend systems needed for vendor apps to integrate with the Thru user app, providing real-time data for grocery items and food outlets.

## 1. Grocery Vendor Integration

### 1.1 Grocery Item Search API
**Endpoint**: `POST /api/grocery/search`
**Purpose**: Search for grocery items based on user query

**Request Body**:
```json
{
  "query": "fresh tomatoes",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "maxDetourKm": 5
}
```

**Response**:
```json
{
  "items": [
    {
      "id": "item_123",
      "name": "Fresh Tomatoes",
      "category": "vegetables",
      "unit": "kg",
      "vendors": [
        {
          "vendorId": "vendor_1",
          "vendorName": "FreshMart",
          "price": 45,
          "detour": "0.2 km",
          "eta": "5 min",
          "availability": true,
          "imageUrl": "https://example.com/tomatoes.jpg"
        }
      ]
    }
  ]
}
```

### 1.2 Grocery Item Pricing API
**Endpoint**: `POST /api/grocery/pricing`
**Purpose**: Get real-time pricing for specific grocery items

**Request Body**:
```json
{
  "items": [
    {
      "itemId": "item_123",
      "quantity": 2
    }
  ],
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

**Response**:
```json
{
  "pricing": [
    {
      "itemId": "item_123",
      "vendors": [
        {
          "vendorId": "vendor_1",
          "vendorName": "FreshMart",
          "unitPrice": 45,
          "totalPrice": 90,
          "detour": "0.2 km",
          "eta": "5 min",
          "lastUpdated": "2024-01-15T10:30:00Z"
        }
      ]
    }
  ]
}
```

### 1.3 Grocery Order Placement API
**Endpoint**: `POST /api/grocery/order`
**Purpose**: Place grocery order with selected vendors

**Request Body**:
```json
{
  "userId": "user_123",
  "items": [
    {
      "itemId": "item_123",
      "quantity": 2,
      "selectedVendorId": "vendor_1"
    }
  ],
  "route": {
    "startLocation": "Location A",
    "endLocation": "Location B",
    "estimatedArrival": "2024-01-15T15:30:00Z"
  }
}
```

## 2. Food Vendor Integration

### 2.1 Food Outlet Discovery API
**Endpoint**: `POST /api/food/discover`
**Purpose**: Find food outlets based on route and filters

**Request Body**:
```json
{
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "route": {
    "startLocation": "Location A",
    "endLocation": "Location B",
    "maxDetourKm": 5
  },
  "filters": {
    "onTheWayOnly": true,
    "vegOnly": false,
    "ratingFilter": "top-rated",
    "cuisine": "Indian",
    "costForTwo": "500-1000",
    "prepTime": "15-30"
  }
}
```

**Response**:
```json
{
  "outlets": [
    {
      "id": "outlet_123",
      "name": "Spice Palace",
      "type": "restaurant",
      "category": "restaurants",
      "cuisine": "Indian",
      "rating": 4.5,
      "costForTwo": 800,
      "prepTime": "20 min",
      "detour": "0.5 km",
      "eta": "25 min",
      "isVeg": false,
      "isOnTheWay": true,
      "imageUrl": "https://example.com/spice-palace.jpg",
      "menu": [
        {
          "id": "menu_1",
          "name": "Butter Chicken",
          "price": 350,
          "isVeg": false,
          "prepTime": "15 min"
        }
      ]
    }
  ]
}
```

### 2.2 Food Menu API
**Endpoint**: `GET /api/food/menu/{outletId}`
**Purpose**: Get detailed menu for a specific food outlet

**Response**:
```json
{
  "outletId": "outlet_123",
  "outletName": "Spice Palace",
  "menu": {
    "categories": [
      {
        "name": "Main Course",
        "items": [
          {
            "id": "menu_1",
            "name": "Butter Chicken",
            "description": "Tender chicken in rich tomato gravy",
            "price": 350,
            "isVeg": false,
            "prepTime": "15 min",
            "imageUrl": "https://example.com/butter-chicken.jpg",
            "customizations": [
              {
                "name": "Spice Level",
                "options": ["Mild", "Medium", "Hot"]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 2.3 Food Order Placement API
**Endpoint**: `POST /api/food/order`
**Purpose**: Place food order

**Request Body**:
```json
{
  "userId": "user_123",
  "outletId": "outlet_123",
  "items": [
    {
      "menuItemId": "menu_1",
      "quantity": 2,
      "customizations": {
        "spiceLevel": "Medium"
      }
    }
  ],
  "route": {
    "startLocation": "Location A",
    "endLocation": "Location B",
    "estimatedArrival": "2024-01-15T15:30:00Z"
  }
}
```

## 3. Real-time Updates

### 3.1 WebSocket Connection
**Endpoint**: `wss://api.thru.com/ws`
**Purpose**: Real-time updates for order status, pricing changes, availability

**Message Types**:
- `PRICE_UPDATE`: Grocery item price changes
- `AVAILABILITY_UPDATE`: Item availability changes
- `ORDER_STATUS_UPDATE`: Order status changes
- `VENDOR_RESPONSE`: Vendor responses to orders

### 3.2 Push Notifications
**Service**: Firebase Cloud Messaging (FCM)
**Purpose**: Notify users of important updates

**Notification Types**:
- Order confirmation
- Price updates
- Vendor responses
- Order ready for pickup

## 4. Data Requirements

### 4.1 Grocery Vendors Must Provide
- Item catalog with categories
- Real-time pricing
- Availability status
- Location and detour information
- ETA for pickup
- Image URLs for items (optional)

### 4.2 Food Vendors Must Provide
- Outlet information (name, type, cuisine)
- Menu with categories and items
- Pricing for each item
- Prep time estimates
- Vegetarian/Non-vegetarian classification
- Rating and reviews
- Location and detour information
- Image URLs for outlets and menu items

## 4.3 Database Schema for Item Collection & Pricing

### 4.3.1 User Items Database
**Table: `user_grocery_items`**
```sql
CREATE TABLE user_grocery_items (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL, -- For search matching
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  search_count INT DEFAULT 1,
  last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_normalized_name (normalized_name),
  INDEX idx_user_id (user_id),
  INDEX idx_search_count (search_count DESC)
);
```

### 4.3.2 Vendor Pricing Database
**Table: `vendor_item_pricing`**
```sql
CREATE TABLE vendor_item_pricing (
  id VARCHAR(255) PRIMARY KEY,
  vendor_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  detour_km DECIMAL(5,2),
  eta_minutes INT,
  availability BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_normalized_name (normalized_name),
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_price (price),
  INDEX idx_location (location_lat, location_lng)
);
```

### 4.3.3 Item Suggestions Database
**Table: `item_suggestions`**
```sql
CREATE TABLE item_suggestions (
  id VARCHAR(255) PRIMARY KEY,
  normalized_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  estimated_price DECIMAL(10,2),
  confidence_score DECIMAL(3,2) DEFAULT 0.0, -- Based on data availability
  search_frequency INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_normalized_name (normalized_name),
  INDEX idx_confidence_score (confidence_score DESC),
  INDEX idx_search_frequency (search_frequency DESC)
);
```

### 4.3.4 Data Collection APIs

#### 4.3.4.1 Track User Item Searches
**Endpoint**: `POST /api/grocery/track-search`
**Purpose**: Track what items users are searching for to build suggestions

**Request Body**:
```json
{
  "userId": "user_123",
  "itemName": "fresh tomatoes",
  "normalizedName": "fresh tomatoes",
  "category": "vegetables"
}
```

#### 4.3.4.2 Update Item Pricing Data
**Endpoint**: `POST /api/grocery/update-pricing`
**Purpose**: Update pricing data when vendors respond with prices

**Request Body**:
```json
{
  "vendorId": "vendor_123",
  "itemName": "fresh tomatoes",
  "normalizedName": "fresh tomatoes",
  "price": 45.00,
  "unit": "kg",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "detourKm": 0.2,
  "etaMinutes": 5,
  "availability": true
}
```

#### 4.3.4.3 Get Item Suggestions
**Endpoint**: `GET /api/grocery/suggestions?q={query}&limit={limit}`
**Purpose**: Get item suggestions based on search query and collected data

**Response**:
```json
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "name": "Fresh Tomatoes",
      "normalizedName": "fresh tomatoes",
      "category": "vegetables",
      "estimatedPrice": 45.00,
      "confidenceScore": 0.85,
      "searchFrequency": 150
    }
  ]
}
```

### 4.3.5 Data Processing Pipeline

#### 4.3.5.1 Item Normalization
- Convert to lowercase
- Remove special characters
- Handle plural/singular forms
- Standardize units (kg, grams, pieces, etc.)

#### 4.3.5.2 Price Aggregation
- Calculate average prices by location
- Weight by vendor reliability
- Update confidence scores based on data volume
- Handle price outliers

#### 4.3.5.3 Suggestion Ranking
- Sort by search frequency
- Boost confidence score for items with pricing data
- Consider user's location and preferences
- Apply category-based filtering

## 5. Authentication & Security

### 5.1 Vendor Authentication
- JWT tokens for vendor API access
- Rate limiting per vendor
- API key management

### 5.2 Data Validation
- Input validation for all API endpoints
- Sanitization of user inputs
- Rate limiting for search queries

## 6. Performance Requirements

### 6.1 Response Times
- Search APIs: < 2 seconds
- Pricing APIs: < 1 second
- Order placement: < 3 seconds

### 6.2 Caching
- Redis for frequently accessed data
- CDN for images
- Database query optimization

## 7. Error Handling

### 7.1 Standard Error Response
```json
{
  "error": {
    "code": "VENDOR_UNAVAILABLE",
    "message": "Vendor is currently unavailable",
    "details": "Please try again later"
  }
}
```

### 7.2 Common Error Codes
- `VENDOR_UNAVAILABLE`: Vendor system is down
- `ITEM_OUT_OF_STOCK`: Item not available
- `PRICING_ERROR`: Unable to fetch pricing
- `LOCATION_NOT_SERVED`: Vendor doesn't serve this location

## 8. Testing Requirements

### 8.1 API Testing
- Unit tests for all endpoints
- Integration tests with vendor systems
- Load testing for high traffic

### 8.2 Data Quality
- Validation of vendor data accuracy
- Regular price comparison checks
- Availability verification

## 9. Monitoring & Analytics

### 9.1 Metrics to Track
- API response times
- Order success rates
- Vendor response times
- User search patterns
- Popular items and outlets

### 9.2 Alerts
- API downtime alerts
- High error rate alerts
- Vendor unavailability alerts
- Performance degradation alerts

## 10. Implementation Timeline

### Phase 1 (Weeks 1-2)
- Set up basic API structure
- Implement grocery search and pricing APIs
- Basic vendor authentication

### Phase 2 (Weeks 3-4)
- Implement food discovery APIs
- Add filtering and search functionality
- Real-time pricing updates

### Phase 3 (Weeks 5-6)
- Order placement and management
- WebSocket integration
- Push notifications

### Phase 4 (Weeks 7-8)
- Performance optimization
- Monitoring and analytics
- Error handling and recovery

## 11. Vendor Onboarding

### 11.1 Required Information
- Business registration details
- API endpoint URLs
- Authentication credentials
- Service area coverage
- Operating hours

### 11.2 Integration Process
1. Vendor registration and verification
2. API integration testing
3. Data quality validation
4. Go-live with limited items
5. Full rollout after validation

This integration will enable vendors to seamlessly provide their inventory and pricing data to the Thru user app, creating a comprehensive marketplace for route-based shopping and dining.
