# Thru Vendor System API Documentation

## Overview
This document provides comprehensive documentation for the Thru Vendor System APIs, including grocery and food vendor integration endpoints.

## Base URL
```
https://your-domain.com/api
```

## Authentication
Most APIs require authentication using API keys. Include the API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Error Handling
All APIs return consistent error responses:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  }
}
```

## Rate Limiting
- 100 requests per minute per API key
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when rate limit resets

---

## Grocery APIs

### 1. Search Grocery Items
**Endpoint**: `POST /grocery/search`

Search for grocery items based on user query and location.

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

### 2. Get Grocery Item Pricing
**Endpoint**: `POST /grocery/pricing`

Get real-time pricing for specific grocery items.

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

### 3. Place Grocery Order
**Endpoint**: `POST /grocery/order`

Place a grocery order with selected vendors.

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

**Response**:
```json
{
  "orderId": "order_456",
  "status": "pending",
  "totalAmount": 90,
  "estimatedPickupTime": "2024-01-15T16:00:00Z",
  "vendors": [
    {
      "vendorId": "vendor_1",
      "vendorName": "FreshMart",
      "items": [
        {
          "itemId": "item_123",
          "name": "Fresh Tomatoes",
          "quantity": 2,
          "unitPrice": 45,
          "totalPrice": 90
        }
      ],
      "subtotal": 90
    }
  ]
}
```

---

## Food APIs

### 1. Discover Food Outlets
**Endpoint**: `POST /food/discover`

Find food outlets based on route and filters.

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

### 2. Get Food Menu
**Endpoint**: `GET /food/menu/{outletId}`

Get detailed menu for a specific food outlet.

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

### 3. Place Food Order
**Endpoint**: `POST /food/order`

Place a food order.

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

**Response**:
```json
{
  "orderId": "order_789",
  "status": "pending",
  "totalAmount": 700,
  "estimatedPickupTime": "2024-01-15T16:15:00Z",
  "outlet": {
    "outletId": "outlet_123",
    "outletName": "Spice Palace",
    "items": [
      {
        "menuItemId": "menu_1",
        "name": "Butter Chicken",
        "quantity": 2,
        "unitPrice": 350,
        "totalPrice": 700,
        "customizations": {
          "spiceLevel": "Medium"
        }
      }
    ],
    "subtotal": 700
  }
}
```

---

## Real-time Updates

### WebSocket Connection
**Endpoint**: `wss://your-domain.com/api/ws`

Connect to WebSocket for real-time updates.

**Query Parameters**:
- `userId`: User ID for user-specific updates
- `vendorId`: Vendor ID for vendor-specific updates

**Message Types**:
- `PRICE_UPDATE`: Grocery item price changes
- `AVAILABILITY_UPDATE`: Item availability changes
- `ORDER_STATUS_UPDATE`: Order status changes
- `VENDOR_RESPONSE`: Vendor responses to orders

---

## Vendor Management APIs

### 1. List API Keys
**Endpoint**: `GET /vendor/api-keys?vendorId={vendorId}`

Get all API keys for a vendor.

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
```

**Response**:
```json
{
  "apiKeys": [
    {
      "keyId": "key_123",
      "name": "Production Key",
      "permissions": ["read", "write"],
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "lastUsed": "2024-01-15T14:30:00Z",
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  ]
}
```

### 2. Create API Key
**Endpoint**: `POST /vendor/api-keys`

Create a new API key for a vendor.

**Request Body**:
```json
{
  "vendorId": "vendor_123",
  "name": "New API Key",
  "permissions": ["read", "write"],
  "expiresInDays": 365
}
```

**Response**:
```json
{
  "keyId": "key_456",
  "apiKey": "sk_live_1234567890abcdef",
  "message": "API key created successfully. Store it securely as it cannot be retrieved again."
}
```

### 3. Revoke API Key
**Endpoint**: `DELETE /vendor/api-keys?vendorId={vendorId}&keyId={keyId}`

Revoke an API key.

**Response**:
```json
{
  "message": "API key revoked successfully"
}
```

---

## Analytics APIs

### Get Analytics
**Endpoint**: `GET /analytics`

Get analytics data for the system.

**Query Parameters**:
- `type`: Analytics type (`overview`, `api`, `orders`, `vendors`, `custom`)
- `hours`: Time period in hours (1-168, default: 24)
- `startDate`: Start date for custom analytics (ISO format)
- `endDate`: End date for custom analytics (ISO format)

**Response**:
```json
{
  "type": "overview",
  "period": 24,
  "data": {
    "summary": {
      "totalOrders": 150,
      "totalRevenue": 45000,
      "averageOrderValue": 300,
      "activeVendors": 25,
      "totalUsers": 500,
      "successRate": 85.5
    },
    "orderBreakdown": {
      "byType": {
        "grocery": 100,
        "food": 50
      },
      "byStatus": {
        "pending": 10,
        "accepted": 120,
        "completed": 15,
        "cancelled": 5
      }
    }
  },
  "generatedAt": "2024-01-15T15:30:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Missing or invalid required fields |
| `UNAUTHORIZED` | Invalid or missing API key |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_UNAVAILABLE` | Database service unavailable |
| `VENDOR_UNAVAILABLE` | Vendor service unavailable |
| `ITEM_OUT_OF_STOCK` | Item not available |
| `PRICING_ERROR` | Unable to fetch pricing |
| `ORDER_ERROR` | Order processing failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

## SDKs and Examples

### JavaScript/TypeScript
```javascript
// Search for grocery items
const response = await fetch('/api/grocery/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    query: 'fresh tomatoes',
    location: {
      latitude: 12.9716,
      longitude: 77.5946
    },
    maxDetourKm: 5
  })
});

const data = await response.json();
```

### Python
```python
import requests

# Search for grocery items
response = requests.post(
    'https://your-domain.com/api/grocery/search',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'query': 'fresh tomatoes',
        'location': {
            'latitude': 12.9716,
            'longitude': 77.5946
        },
        'maxDetourKm': 5
    }
)

data = response.json()
```

---

## Support

For API support and questions:
- Email: api-support@thru.com
- Documentation: https://docs.thru.com
- Status Page: https://status.thru.com

## Frontend Integration Requirements

### Authentication
- Use API keys for vendor authentication
- Store keys securely (localStorage/sessionStorage)
- Handle token expiration gracefully

### Real-time Features
- WebSocket connection for live updates
- Show real-time price changes
- Display order status updates
- Handle vendor responses

### UI/UX Requirements
- Mobile-first responsive design
- Loading states for all API calls
- Error boundaries for API failures
- Offline support where possible

### State Management
- Use React Context or Redux for global state
- Cache API responses appropriately
- Handle optimistic updates for orders

💡 Pro Tips for the Frontend AI
Ask it to create TypeScript interfaces based on the API responses
Request error handling components that match your error codes
Have it build reusable API service functions for each endpoint
Ask for WebSocket integration examples using your WebSocket client


