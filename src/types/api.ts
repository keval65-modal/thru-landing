// Thru Vendor System API Types
// Generated from API_DOCUMENTATION.md

// Base Types
export interface Location {
  latitude: number;
  longitude: number;
}

export interface Route {
  startLocation: string;
  endLocation: string;
  estimatedArrival: string;
  maxDetourKm?: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

// Grocery API Types
export interface GrocerySearchRequest {
  query: string;
  location: Location;
  maxDetourKm: number;
}

export interface GroceryVendor {
  vendorId: string;
  vendorName: string;
  price: number;
  detour: string;
  eta: string;
  availability: boolean;
  imageUrl?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  vendors: GroceryVendor[];
}

export interface GrocerySearchResponse {
  items: GroceryItem[];
}

export interface GroceryPricingRequest {
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  location: Location;
}

export interface GroceryPricingVendor {
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  totalPrice: number;
  detour: string;
  eta: string;
  lastUpdated: string;
}

export interface GroceryPricingItem {
  itemId: string;
  vendors: GroceryPricingVendor[];
}

export interface GroceryPricingResponse {
  pricing: GroceryPricingItem[];
}

export interface GroceryOrderItem {
  itemId: string;
  quantity: number;
  selectedVendorId: string;
}

export interface GroceryOrderRequest {
  userId: string;
  items: GroceryOrderItem[];
  route: Route;
}

export interface GroceryOrderVendorItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GroceryOrderVendor {
  vendorId: string;
  vendorName: string;
  items: GroceryOrderVendorItem[];
  subtotal: number;
}

export interface GroceryOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  estimatedPickupTime: string;
  vendors: GroceryOrderVendor[];
}

// Food API Types
export interface FoodFilters {
  onTheWayOnly: boolean;
  vegOnly: boolean;
  ratingFilter: 'all' | 'top-rated' | 'new';
  cuisine?: string;
  costForTwo?: string;
  prepTime?: string;
}

export interface FoodDiscoverRequest {
  location: Location;
  route: Route;
  filters: FoodFilters;
}

export interface FoodMenuItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  prepTime: string;
}

export interface FoodOutlet {
  id: string;
  name: string;
  type: string;
  category: string;
  cuisine: string;
  rating: number;
  costForTwo: number;
  prepTime: string;
  detour: string;
  eta: string;
  isVeg: boolean;
  isOnTheWay: boolean;
  imageUrl?: string;
  menu: FoodMenuItem[];
}

export interface FoodDiscoverResponse {
  outlets: FoodOutlet[];
}

export interface FoodMenuCustomization {
  name: string;
  options: string[];
}

export interface FoodMenuDetailedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  prepTime: string;
  imageUrl?: string;
  customizations: FoodMenuCustomization[];
}

export interface FoodMenuCategory {
  name: string;
  items: FoodMenuDetailedItem[];
}

export interface FoodMenuResponse {
  outletId: string;
  outletName: string;
  menu: {
    categories: FoodMenuCategory[];
  };
}

export interface FoodOrderItem {
  menuItemId: string;
  quantity: number;
  customizations?: Record<string, string>;
}

export interface FoodOrderRequest {
  userId: string;
  outletId: string;
  items: FoodOrderItem[];
  route: Route;
}

export interface FoodOrderItemDetail {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: Record<string, string>;
}

export interface FoodOrderOutlet {
  outletId: string;
  outletName: string;
  items: FoodOrderItemDetail[];
  subtotal: number;
}

export interface FoodOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  estimatedPickupTime: string;
  outlet: FoodOrderOutlet;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'PRICE_UPDATE' | 'AVAILABILITY_UPDATE' | 'ORDER_STATUS_UPDATE' | 'VENDOR_RESPONSE';
  data: any;
  timestamp: string;
}

// Vendor Management Types
export interface ApiKey {
  keyId: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  expiresAt: string;
}

export interface ApiKeysResponse {
  apiKeys: ApiKey[];
}

export interface CreateApiKeyRequest {
  vendorId: string;
  name: string;
  permissions: string[];
  expiresInDays: number;
}

export interface CreateApiKeyResponse {
  keyId: string;
  apiKey: string;
  message: string;
}

// Analytics Types
export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeVendors: number;
  totalUsers: number;
  successRate: number;
}

export interface OrderBreakdown {
  byType: {
    grocery: number;
    food: number;
  };
  byStatus: {
    pending: number;
    accepted: number;
    completed: number;
    cancelled: number;
  };
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  orderBreakdown: OrderBreakdown;
}

export interface AnalyticsResponse {
  type: string;
  period: number;
  data: AnalyticsData;
  generatedAt: string;
}

// Error Codes
export type ErrorCode = 
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_UNAVAILABLE'
  | 'VENDOR_UNAVAILABLE'
  | 'ITEM_OUT_OF_STOCK'
  | 'PRICING_ERROR'
  | 'ORDER_ERROR'
  | 'INTERNAL_ERROR';

// API Client Configuration
export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
}

// Rate Limiting Headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}


