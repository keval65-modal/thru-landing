// React hooks for Thru API integration
// Provides easy-to-use hooks for API calls with loading states and error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, ThruApiClient } from '@/lib/api-client';
import {
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
  WebSocketMessage,
  Location,
  FoodFilters
} from '@/types/api';

// Generic API hook state
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic API hook
function useApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, dependencies);

  return { ...state, execute };
}

// Grocery API hooks
export function useGrocerySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [maxDetourKm, setMaxDetourKm] = useState(5);

  const searchGrocery = useApiCall<GrocerySearchResponse>(
    async () => {
      if (!location) throw new Error('Location is required');
      
      const request: GrocerySearchRequest = {
        query: searchQuery,
        location,
        maxDetourKm,
      };
      
      return await apiClient.searchGroceryItems(request);
    },
    [searchQuery, location, maxDetourKm]
  );

  const search = useCallback((query: string, loc: Location, detour: number = 5) => {
    setSearchQuery(query);
    setLocation(loc);
    setMaxDetourKm(detour);
  }, []);

  return {
    ...searchGrocery,
    search,
    searchQuery,
    setSearchQuery,
    location,
    setLocation,
    maxDetourKm,
    setMaxDetourKm,
  };
}

export function useGroceryPricing() {
  const getPricing = useApiCall<GroceryPricingResponse>(
    async () => {
      throw new Error('Pricing request not configured');
    }
  );

  const fetchPricing = useCallback(async (request: GroceryPricingRequest) => {
    getPricing.execute();
  }, [getPricing]);

  return { ...getPricing, fetchPricing };
}

export function useGroceryOrder() {
  const placeOrder = useApiCall<GroceryOrderResponse>(
    async () => {
      throw new Error('Order request not configured');
    }
  );

  const submitOrder = useCallback(async (request: GroceryOrderRequest) => {
    placeOrder.execute();
  }, [placeOrder]);

  return { ...placeOrder, submitOrder };
}

// Food API hooks
export function useFoodDiscovery() {
  const [filters, setFilters] = useState<FoodFilters>({
    onTheWayOnly: true,
    vegOnly: false,
    ratingFilter: 'all',
  });
  const [location, setLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<{ startLocation: string; endLocation: string; maxDetourKm: number } | null>(null);

  const discoverFood = useApiCall<FoodDiscoverResponse>(
    async () => {
      if (!location || !route) throw new Error('Location and route are required');
      
      const request: FoodDiscoverRequest = {
        location,
        route: {
          ...route,
          estimatedArrival: new Date().toISOString(),
        },
        filters,
      };
      
      return await apiClient.discoverFoodOutlets(request);
    },
    [location, route, filters]
  );

  const search = useCallback((
    loc: Location,
    routeData: { startLocation: string; endLocation: string; maxDetourKm: number },
    filterOverrides?: Partial<FoodFilters>
  ) => {
    setLocation(loc);
    setRoute(routeData);
    if (filterOverrides) {
      setFilters(prev => ({ ...prev, ...filterOverrides }));
    }
  }, []);

  return {
    ...discoverFood,
    search,
    filters,
    setFilters,
    location,
    setLocation,
    route,
    setRoute,
  };
}

export function useFoodMenu() {
  const [outletId, setOutletId] = useState<string | null>(null);

  const getMenu = useApiCall<FoodMenuResponse>(
    async () => {
      if (!outletId) throw new Error('Outlet ID is required');
      return await apiClient.getFoodMenu(outletId);
    },
    [outletId]
  );

  const fetchMenu = useCallback((id: string) => {
    setOutletId(id);
  }, []);

  return { ...getMenu, fetchMenu, outletId };
}

export function useFoodOrder() {
  const placeOrder = useApiCall<FoodOrderResponse>(
    async () => {
      throw new Error('Order request not configured');
    }
  );

  const submitOrder = useCallback(async (request: FoodOrderRequest) => {
    placeOrder.execute();
  }, [placeOrder]);

  return { ...placeOrder, submitOrder };
}

// WebSocket hook
export function useWebSocket(userId?: string, vendorId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<ThruApiClient | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await apiClient.connectWebSocket(userId, vendorId);
        setIsConnected(true);
        setError(null);
        
        apiClient.onWebSocketMessage((message) => {
          setMessages(prev => [...prev, message]);
        });
        
        wsRef.current = apiClient;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      apiClient.disconnectWebSocket();
      setIsConnected(false);
    };
  }, [userId, vendorId]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && isConnected) {
      // WebSocket send implementation would go here
      console.log('Sending message:', message);
    }
  }, [isConnected]);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
  };
}

// Location hook
export function useCurrentLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loc = await apiClient.getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
  };
}

// Analytics hook
export function useAnalytics() {
  const [type, setType] = useState('overview');
  const [hours, setHours] = useState(24);

  const getAnalytics = useApiCall(
    async () => {
      return await apiClient.getAnalytics(type, hours);
    },
    [type, hours]
  );

  const fetchAnalytics = useCallback((analyticsType: string, timeHours: number) => {
    setType(analyticsType);
    setHours(timeHours);
  }, []);

  return {
    ...getAnalytics,
    fetchAnalytics,
    type,
    setType,
    hours,
    setHours,
  };
}

// Utility hook for API client configuration
export function useApiClient() {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if API client is properly configured
    const checkConfiguration = () => {
      const hasBaseUrl = !!process.env.NEXT_PUBLIC_API_BASE_URL;
      const hasApiKey = !!process.env.NEXT_PUBLIC_API_KEY;
      setIsConfigured(hasBaseUrl && hasApiKey);
    };

    checkConfiguration();
  }, []);

  return {
    isConfigured,
    apiClient,
  };
}
