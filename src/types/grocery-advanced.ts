// types/grocery-advanced.ts - Advanced grocery shopping data structures

import { Timestamp } from 'firebase/firestore'

export interface UserRouteData {
  start: {
    latitude: number
    longitude: number
    address: string
    timestamp: number // When user started journey
  }
  destination: {
    latitude: number
    longitude: number
    address: string
    estimatedArrival: number // Timestamp
  }
  detourTolerance: number // in kilometers (0.5 to 5)
  routePolyline: string // Google Maps encoded polyline
  totalDistance: number // in kilometers
  estimatedDuration: number // in minutes
  transportMode: 'driving' | 'walking' | 'transit' // How user is traveling
  currentLocation?: {
    latitude: number
    longitude: number
    timestamp: number
  } // Real-time location updates
}

export interface AdvancedOrderData {
  id?: string
  userId: string
  userInfo: {
    name: string
    phone: string
    email?: string
  }
  items: CartItem[]
  userRoute: UserRouteData
  orderPreferences: {
    allowMultiShop: boolean // Can order from multiple shops
    maxShops: number // Maximum number of shops (if multi-shop)
    priority: 'speed' | 'price' | 'distance' // Order priority
    allowSubstitutions: boolean // Allow similar products if exact not available
  }
  selectedShops?: string[] // Shop IDs if user manually selects
  notes?: string
  estimatedReadyTime?: number // Timestamp when order will be ready
  totalAmount: number
  status: 'pending' | 'accepted' | 'multi_shop_selection' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  createdAt: Timestamp
  updatedAt?: Timestamp
}

export interface ShopRouteData {
  id: string
  shopName: string
  location: {
    latitude: number
    longitude: number
    address: string
  }
  routeInfo: {
    distanceFromRoute: number // Distance from user's route in km
    detourDistance: number // Additional distance to visit this shop
    estimatedTime: number // Time to reach shop in minutes
    routePosition: number // Position along route (0-1)
  }
  availability: {
    hasAllItems: boolean
    missingItems: string[]
    availableItems: Array<{
      productId: string
      quantity: number
      price: number
    }>
    estimatedPreparationTime: number // in minutes
  }
  pricing: {
    totalPrice: number
    itemCount: number
    averageItemPrice: number
  }
  metadata: {
    rating?: number
    isOpen: boolean
    phone?: string
    lastUpdated: Timestamp
  }
}

export interface CartItem {
  product: {
    id: string
    product_name: string
    display_name: string
    price: number
    pack_unit: string
    pack_value: number
    sku_id: string
    source: string
    category?: string
    image_url?: string
  }
  quantity: number
  totalPrice: number
}

export interface GroceryProduct {
  id: string
  product_name: string
  display_name: string
  pack_unit: string
  pack_value: number
  price: number
  sku_id: string
  source: string
  category?: string
  image_url?: string
  description?: string
  is_available?: boolean
  created_at?: Timestamp
  updated_at?: Timestamp
}

export interface LocationUpdate {
  latitude: number
  longitude: number
  timestamp: number
}

export interface VendorResponse {
  shopId: string
  orderId: string
  responseTime: number // in seconds
  status: 'accepted' | 'rejected' | 'timeout'
  availableItems: Array<{
    productId: string
    quantity: number
    price: number
  }>
  missingItems: string[]
  estimatedPreparationTime: number // in minutes
  notes?: string
  respondedAt: Timestamp
}

export interface VendorResponseStats {
  averageResponseTime: number
  totalOrders: number
  acceptanceRate: number
}

export interface RouteOptimizationResult {
  shops: ShopRouteData[]
  routePolyline: string
  detourArea: {
    center: { latitude: number; longitude: number }
    radius: number
  }
  totalDetourDistance: number
  estimatedTotalTime: number
}

export interface OrderStatusUpdate {
  orderId: string
  status: AdvancedOrderData['status']
  timestamp: number
  message?: string
  shopId?: string
  estimatedReadyTime?: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface ShopMarker {
  id: string
  position: {
    lat: number
    lng: number
  }
  title: string
  availability: 'available' | 'partial' | 'unavailable'
  distance: number
  rating?: number
  isSelected: boolean
}

export interface RouteStep {
  step: 'route' | 'shopping' | 'shop_selection' | 'order_placed' | 'tracking'
  title: string
  description: string
  completed: boolean
  active: boolean
}
