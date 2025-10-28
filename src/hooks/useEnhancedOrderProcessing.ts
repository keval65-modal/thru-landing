// hooks/useEnhancedOrderProcessing.ts - Hook for enhanced order processing with store type detection

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { enhancedOrderService } from '@/lib/enhanced-order-service'
import { 
  ProcessedOrder,
  ProcessedItem,
  VendorResponse,
  StoreType,
  EnhancedGroceryProduct,
  UserGeneratedItem,
  CartItem,
  UserRouteData
} from '@/types/grocery-advanced'

export function useEnhancedOrderProcessing() {
  // Products state
  const [products, setProducts] = useState<EnhancedGroceryProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartTotal, setCartTotal] = useState(0)

  // Order state
  const [currentOrder, setCurrentOrder] = useState<ProcessedOrder | null>(null)
  const [vendorResponses, setVendorResponses] = useState<VendorResponse[]>([])
  const [selectedVendor, setSelectedVendor] = useState<VendorResponse | null>(null)

  // Store type state
  const [storeType, setStoreType] = useState<StoreType>('grocery')
  const [storeCapabilities, setStoreCapabilities] = useState(enhancedOrderService.getStoreCapabilities('grocery'))

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update store capabilities when store type changes
  useEffect(() => {
    setStoreCapabilities(enhancedOrderService.getStoreCapabilities(storeType))
  }, [storeType])

  // Enhanced product search with fuzzy matching
  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true)
      enhancedOrderService.searchProductsWithFuzzy(searchTerm, 20)
        .then((newProducts) => {
          setProducts(newProducts)
          setIsSearching(false)
        })
        .catch((err) => {
          console.error('Error searching products:', err)
          setProducts([])
          setIsSearching(false)
        })
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

  // Cart management functions
  const addToCart = useCallback((product: EnhancedGroceryProduct) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * (product.price || 0)
              }
            : item
        )
      } else {
        const newItem: CartItem = {
          product: {
            id: product.id,
            product_name: product.product_name,
            display_name: product.display_name,
            price: product.price || 0,
            pack_unit: product.pack_unit,
            pack_value: product.pack_value,
            sku_id: product.sku_id,
            source: product.source,
            category: product.category,
            image_url: product.image_url
          },
          quantity: 1,
          totalPrice: product.price || 0
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

  // Add user-generated item
  const addUserGeneratedItem = useCallback(async (item: Omit<UserGeneratedItem, 'id' | 'created_at' | 'usage_count'>) => {
    try {
      setLoading(true)
      const itemId = await enhancedOrderService.addUserGeneratedItem(item)
      
      // Refresh search results
      if (searchTerm.trim()) {
        const newProducts = await enhancedOrderService.searchProductsWithFuzzy(searchTerm, 20)
        setProducts(newProducts)
      }
      
      return itemId
    } catch (err) {
      console.error('Error adding user-generated item:', err)
      setError('Failed to add item. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  // Place processed order
  const placeProcessedOrder = useCallback(async (
    orderData: Omit<ProcessedOrder, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'storeType'>
  ) => {
    try {
      setLoading(true)
      setError(null)

      if (!auth || !auth.currentUser) {
        throw new Error('User must be logged in to place an order')
      }

      const fullOrderData = {
        ...orderData,
        storeType
      }

      const result = await enhancedOrderService.placeProcessedOrder(fullOrderData)
      
      if (result.orderId) {
        // Subscribe to order updates
        const unsubscribe = enhancedOrderService.subscribeToProcessedOrder(
          result.orderId,
          (order) => {
            setCurrentOrder(order)
          }
        )

        // Subscribe to vendor responses
        const unsubscribeResponses = enhancedOrderService.subscribeToVendorResponses(
          result.orderId,
          (responses) => {
            setVendorResponses(responses)
          }
        )

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
      console.error('Error placing processed order:', err)
      setError('Failed to place order. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [storeType])

  // Accept vendor response
  const acceptVendorResponse = useCallback(async (vendorResponse: VendorResponse) => {
    try {
      if (!currentOrder) {
        throw new Error('No current order to accept vendor response for')
      }

      setLoading(true)
      await enhancedOrderService.acceptVendorResponse(currentOrder.id, vendorResponse)
      setSelectedVendor(vendorResponse)
    } catch (err) {
      console.error('Error accepting vendor response:', err)
      setError('Failed to accept vendor response. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [currentOrder])

  // Get order status from vendor app
  const refreshOrderStatus = useCallback(async () => {
    if (!currentOrder) return

    try {
      const status = await enhancedOrderService.getOrderStatusFromVendor(currentOrder.id)
      console.log('Order status from vendor:', status)
    } catch (err) {
      console.error('Error refreshing order status:', err)
    }
  }, [currentOrder])

  // Get vendor responses from vendor app
  const refreshVendorResponses = useCallback(async () => {
    if (!currentOrder) return

    try {
      const responses = await enhancedOrderService.getVendorResponsesFromVendor(currentOrder.id)
      setVendorResponses(responses)
    } catch (err) {
      console.error('Error refreshing vendor responses:', err)
    }
  }, [currentOrder])

  // Get processed order details from vendor app
  const refreshProcessedOrder = useCallback(async () => {
    if (!currentOrder) return

    try {
      const order = await enhancedOrderService.getProcessedOrderFromVendor(currentOrder.id)
      setCurrentOrder(order)
    } catch (err) {
      console.error('Error refreshing processed order:', err)
    }
  }, [currentOrder])

  // Check if current store type supports grocery processing
  const supportsGroceryProcessing = storeCapabilities.hasGroceryProcessing

  // Get available store types
  const getAvailableStoreTypes = useCallback((): StoreType[] => {
    return ['grocery', 'supermarket', 'medical', 'pharmacy', 'restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub']
  }, [])

  // Get store type display name
  const getStoreTypeDisplayName = useCallback((type: StoreType): string => {
    const displayNames: Record<StoreType, string> = {
      'grocery': 'Grocery Store',
      'supermarket': 'Supermarket',
      'medical': 'Medical Store',
      'pharmacy': 'Pharmacy',
      'restaurant': 'Restaurant',
      'cafe': 'Cafe',
      'cloud_kitchen': 'Cloud Kitchen',
      'bakery': 'Bakery',
      'fast_food': 'Fast Food',
      'fine_dining': 'Fine Dining',
      'food_truck': 'Food Truck',
      'coffee_shop': 'Coffee Shop',
      'bar': 'Bar',
      'pub': 'Pub'
    }
    
    return displayNames[type] || type
  }, [])

  return {
    // Products
    products,
    searchProducts,
    isSearching,
    addUserGeneratedItem,
    
    // Cart
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTotal,
    cartTotal,
    
    // Orders
    currentOrder,
    placeProcessedOrder,
    acceptVendorResponse,
    
    // Vendor responses
    vendorResponses,
    selectedVendor,
    refreshVendorResponses,
    refreshProcessedOrder,
    
    // Store type
    storeType,
    setStoreType,
    storeCapabilities,
    supportsGroceryProcessing,
    getAvailableStoreTypes,
    getStoreTypeDisplayName,
    
    // Utilities
    refreshOrderStatus,
    
    // State
    loading,
    error,
    setError
  }
}
