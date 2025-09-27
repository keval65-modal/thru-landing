// hooks/useAdvancedGroceryShopping.ts - Enhanced grocery shopping hook with route optimization

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { advancedGroceryService } from '@/lib/advanced-grocery-service'
import { inventoryCheckService } from '@/lib/inventory-check-service'
import { fcmService } from '@/lib/fcm-service'
import { 
  UserRouteData, 
  AdvancedOrderData, 
  ShopRouteData, 
  CartItem, 
  GroceryProduct,
  LocationUpdate,
  VendorResponse,
  RouteOptimizationResult
} from '@/types/grocery-advanced'

export function useAdvancedGroceryShopping() {
  // Products state
  const [products, setProducts] = useState<GroceryProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartTotal, setCartTotal] = useState(0)

  // Route and location state
  const [userRoute, setUserRoute] = useState<UserRouteData | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null)

  // Shops state
  const [availableShops, setAvailableShops] = useState<ShopRouteData[]>([])
  const [selectedShops, setSelectedShops] = useState<string[]>([])
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimizationResult | null>(null)

  // Order state
  const [currentOrder, setCurrentOrder] = useState<AdvancedOrderData | null>(null)
  const [vendorResponses, setVendorResponses] = useState<VendorResponse[]>([])
  const [acceptedVendor, setAcceptedVendor] = useState<string | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize FCM
  useEffect(() => {
    const initializeFCM = async () => {
      if (fcmService.isSupported()) {
        await fcmService.requestPermission()
        await fcmService.registerServiceWorker()
      }
    }

    initializeFCM()
  }, [])

  // Real-time product search
  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true)
      const unsubscribe = advancedGroceryService.subscribeToProducts(
        searchTerm,
        20,
        (newProducts) => {
          setProducts(newProducts)
          setIsSearching(false)
        }
      )
      return () => unsubscribe()
    } else {
      setProducts([])
      setIsSearching(false)
    }
  }, [searchTerm])

  // Calculate cart total whenever cart changes
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0)
    setCartTotal(total)
  }, [cart])

  // Find shops when route is set
  useEffect(() => {
    if (userRoute && cart.length > 0) {
      findShopsOnRoute()
    }
  }, [userRoute, cart])

  // Cart management functions
  const addToCart = useCallback((product: GroceryProduct) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * product.price
              }
            : item
        )
      } else {
        const newItem: CartItem = {
          product: {
            id: product.id,
            product_name: product.product_name,
            display_name: product.display_name,
            price: product.price,
            pack_unit: product.pack_unit,
            pack_value: product.pack_value,
            sku_id: product.sku_id,
            source: product.source,
            category: product.category,
            image_url: product.image_url
          },
          quantity: 1,
          totalPrice: product.price
        }
        return [...prev, newItem]
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              totalPrice: quantity * item.product.price
            }
          : item
      )
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const calculateTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [cart])

  // Search functions
  const searchProducts = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  // Route management
  const setUserRouteData = useCallback((route: UserRouteData) => {
    setUserRoute(route)
  }, [])

  const updateLocation = useCallback((location: LocationUpdate) => {
    setUserLocation(prev => ({
      ...prev!,
      latitude: location.latitude,
      longitude: location.longitude,
      address: prev?.address || `${location.latitude}, ${location.longitude}`
    }))

    // Update current order location if exists
    if (currentOrder) {
      advancedGroceryService.updateUserLocation(currentOrder.id!, location)
    }
  }, [currentOrder])

  // Shop management
  const setSelectedShopsData = useCallback((shopIds: string[]) => {
    setSelectedShops(shopIds)
  }, [])

  // Find shops on route
  const findShopsOnRoute = useCallback(async () => {
    if (!userRoute || cart.length === 0) return

    try {
      setLoading(true)
      setError(null)

      const result = await advancedGroceryService.findShopsOnRoute(userRoute, cart)
      setRouteOptimization(result)
      setAvailableShops(result.shops)
    } catch (err) {
      console.error('Error finding shops on route:', err)
      setError('Failed to find shops on your route')
    } finally {
      setLoading(false)
    }
  }, [userRoute, cart])

  // Order management
  const placeAdvancedOrder = useCallback(async (orderData: Omit<AdvancedOrderData, 'createdAt'>) => {
    try {
      setLoading(true)
      setError(null)

      const result = await advancedGroceryService.placeAdvancedOrder(orderData)
      
      if (result.orderId) {
        // Subscribe to order updates
        const unsubscribe = advancedGroceryService.subscribeToAdvancedOrder(
          result.orderId,
          (order) => {
            setCurrentOrder(order)
          }
        )

        // Subscribe to vendor responses
        const unsubscribeResponses = advancedGroceryService.subscribeToVendorResponses(
          result.orderId,
          (responses) => {
            setVendorResponses(responses)
            
            // Check for accepted vendor
            const accepted = responses.find(r => r.status === 'accepted')
            if (accepted) {
              setAcceptedVendor(accepted.shopId)
            }
          }
        )

        // Store unsubscribe functions for cleanup
        return {
          ...result,
          unsubscribe: () => {
            unsubscribe()
            unsubscribeResponses()
          }
        }
      }

      return result
    } catch (err) {
      console.error('Error placing order:', err)
      setError('Failed to place order')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Vendor response handling
  const onVendorResponse = useCallback((response: VendorResponse) => {
    setVendorResponses(prev => [...prev, response])
    
    if (response.status === 'accepted') {
      setAcceptedVendor(response.shopId)
    }
  }, [])

  // Location tracking
  const startLocationTracking = useCallback(() => {
    if (!currentOrder) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now()
        }
        updateLocation(location)
      },
      (error) => {
        console.error('Location tracking error:', error)
        setError('Location tracking failed')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [currentOrder, updateLocation])

  // FCM notification handling
  useEffect(() => {
    const unsubscribe = fcmService.subscribeToOrderNotifications((notification) => {
      // Handle different notification types
      if (notification.data?.type === 'order_accepted') {
        setAcceptedVendor(notification.data.shopId)
      } else if (notification.data?.type === 'order_ready') {
        // Handle order ready notification
        console.log('Order ready:', notification)
      }
    })

    return () => unsubscribe()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any active subscriptions
    }
  }, [])

  return {
    // Products
    products,
    searchProducts,
    isSearching,
    
    // Cart
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTotal,
    cartTotal,
    
    // Route and location
    userRoute,
    setUserRoute: setUserRouteData,
    userLocation,
    updateLocation,
    startLocationTracking,
    
    // Shops
    availableShops,
    selectedShops,
    setSelectedShops: setSelectedShopsData,
    routeOptimization,
    findShopsOnRoute,
    
    // Orders
    currentOrder,
    placeAdvancedOrder,
    
    // Vendor responses
    vendorResponses,
    acceptedVendor,
    onVendorResponse,
    
    // State
    loading,
    error,
    setError
  }
}
