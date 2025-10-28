// Thru Vendor System API Client
// Comprehensive API service for frontend integration

import {
  ApiClientConfig,
  ErrorResponse,
  RateLimitHeaders,
  GrocerySearchRequest,
  GrocerySearchResponse,
  GroceryPricingRequest,
  GroceryPricingResponse,
  GroceryOrderRequest,
  GroceryOrderResponse,
  FoodDiscoverRequest,
  FoodDiscoverResponse,
  FoodMenuResponse,
  FoodOrderRequest,
  FoodOrderResponse,
  ApiKeysResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  AnalyticsResponse,
  WebSocketMessage,
  Location,
  FoodFilters
} from '@/types/api';

export class ThruApiClient {
  private config: ApiClientConfig;
  private wsConnection: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      ...config
    };
  }

  // Base HTTP request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      }

      // Check for rate limit headers
      const rateLimitHeaders: RateLimitHeaders = {
        'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit') || '0',
        'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining') || '0',
        'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset') || '0',
      };

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(`API Error: ${errorData.error.message}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  // Retry mechanism
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts!) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }

  // Grocery APIs
  async searchGroceryItems(request: GrocerySearchRequest): Promise<GrocerySearchResponse> {
    return this.requestWithRetry<GrocerySearchResponse>('/grocery/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getGroceryPricing(request: GroceryPricingRequest): Promise<GroceryPricingResponse> {
    return this.requestWithRetry<GroceryPricingResponse>('/grocery/pricing', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async placeGroceryOrder(request: GroceryOrderRequest): Promise<GroceryOrderResponse> {
    return this.requestWithRetry<GroceryOrderResponse>('/grocery/order', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Food APIs
  async discoverFoodOutlets(request: FoodDiscoverRequest): Promise<FoodDiscoverResponse> {
    return this.requestWithRetry<FoodDiscoverResponse>('/food/discover', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getFoodMenu(outletId: string): Promise<FoodMenuResponse> {
    return this.requestWithRetry<FoodMenuResponse>(`/food/menu/${outletId}`);
  }

  async placeFoodOrder(request: FoodOrderRequest): Promise<FoodOrderResponse> {
    return this.requestWithRetry<FoodOrderResponse>('/food/order', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Vendor Management APIs
  async getApiKeys(vendorId: string): Promise<ApiKeysResponse> {
    return this.requestWithRetry<ApiKeysResponse>(`/vendor/api-keys?vendorId=${vendorId}`);
  }

  async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.requestWithRetry<CreateApiKeyResponse>('/vendor/api-keys', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async revokeApiKey(vendorId: string, keyId: string): Promise<{ message: string }> {
    return this.requestWithRetry<{ message: string }>(
      `/vendor/api-keys?vendorId=${vendorId}&keyId=${keyId}`,
      { method: 'DELETE' }
    );
  }

  // Analytics APIs
  async getAnalytics(
    type: string = 'overview',
    hours: number = 24,
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsResponse> {
    const params = new URLSearchParams({
      type,
      hours: hours.toString(),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });

    return this.requestWithRetry<AnalyticsResponse>(`/analytics?${params}`);
  }

  // WebSocket Connection
  connectWebSocket(userId?: string, vendorId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (vendorId) params.append('vendorId', vendorId);

      const wsUrl = `${this.config.baseUrl.replace('http', 'ws')}/ws?${params}`;
      
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        this.wsReconnectAttempts = 0;
        resolve();
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect(userId, vendorId);
      };
    });
  }

  private attemptReconnect(userId?: string, vendorId?: string) {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      const delay = Math.pow(2, this.wsReconnectAttempts) * 1000;
      
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (attempt ${this.wsReconnectAttempts})`);
        this.connectWebSocket(userId, vendorId).catch(console.error);
      }, delay);
    }
  }

  // WebSocket message handling
  onWebSocketMessage(callback: (message: WebSocketMessage) => void) {
    if (this.wsConnection) {
      this.wsConnection.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          callback(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  }

  // Close WebSocket connection
  disconnectWebSocket() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Utility methods
  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  // Helper method to build food filters
  buildFoodFilters(overrides: Partial<FoodFilters> = {}): FoodFilters {
    return {
      onTheWayOnly: true,
      vegOnly: false,
      ratingFilter: 'all',
      ...overrides,
    };
  }

  // Helper method to validate API key format
  static validateApiKey(apiKey: string): boolean {
    // Basic validation - adjust based on your API key format
    return apiKey.startsWith('sk_') && apiKey.length >= 20;
  }

  // Helper method to format currency
  static formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // Helper method to format time
  static formatTime(date: string | Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  }
}

// Factory function to create API client
export function createThruApiClient(config: ApiClientConfig): ThruApiClient {
  return new ThruApiClient(config);
}

// Default configuration
export const defaultApiConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.thru.com',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
  timeout: 10000,
  retryAttempts: 3,
};

// Export default instance
export const apiClient = createThruApiClient(defaultApiConfig);


