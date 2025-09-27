// app/grocery/page.tsx - Main grocery shopping page with multi-step flow

'use client'

import React, { useState, useEffect } from 'react'
import { useAdvancedGroceryShopping } from '@/hooks/useAdvancedGroceryShopping'
import RoutePlanner from '@/components/RoutePlanner'
import ShopSelectionMap from '@/components/ShopSelectionMap'
import ShopComparison from '@/components/ShopComparison'
import OrderStatusTracker from '@/components/OrderStatusTracker'
import VendorNotificationHandler from '@/components/VendorNotificationHandler'
import { AdvancedOrderData, UserRouteData, LocationUpdate } from '@/types/grocery-advanced'
import { auth } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

type Step = 'route' | 'shopping' | 'shop_selection' | 'order_placed' | 'tracking'

export default function GroceryPage() {
  const [currentStep, setCurrentStep] = useState<Step>('route')
  const [orderStatus, setOrderStatus] = useState<AdvancedOrderData | null>(null)
  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<(() => void)[]>([])
  
  const { toast } = useToast()
  const user = auth?.currentUser

  const {
    products,
    cart,
    userRoute,
    setUserRoute,
    availableShops,
    selectedShops,
    setSelectedShops,
    userLocation,
    updateLocation,
    searchProducts,
    addToCart,
    updateQuantity,
    removeFromCart,
    calculateTotal,
    placeAdvancedOrder,
    loading,
    error,
    setError
  } = useAdvancedGroceryShopping()

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    }
  }, [unsubscribeFunctions])

  // Handle route planning completion
  const handleRouteSet = async (route: UserRouteData) => {
    try {
      setUserRoute(route)
      setCurrentStep('shopping')
      toast({
        title: "Route Set!",
        description: "Your route has been calculated. Now you can start shopping.",
      })
    } catch (err) {
      console.error('Error setting route:', err)
      toast({
        title: "Error",
        description: "Failed to set route. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle shop selection
  const handleShopSelect = async (shopIds: string[]) => {
    try {
      if (!userRoute || !user) {
        toast({
          title: "Error",
          description: "Please complete route planning and ensure you're logged in.",
          variant: "destructive"
        })
        return
      }

      if (shopIds.length === 0) {
        toast({
          title: "No Shops Selected",
          description: "Please select at least one shop to continue.",
          variant: "destructive"
        })
        return
      }

      // Create order data
      const orderData: Omit<AdvancedOrderData, 'createdAt'> = {
        userId: user.uid,
        userInfo: {
          name: user.displayName || 'User',
          phone: user.phoneNumber || '',
          email: user.email || undefined
        },
        items: cart,
        userRoute,
        orderPreferences: {
          allowMultiShop: shopIds.length > 1,
          maxShops: 3,
          priority: 'speed',
          allowSubstitutions: true
        },
        selectedShops: shopIds,
        totalAmount: calculateTotal(),
        status: 'pending'
      }

      // Place order
      const result = await placeAdvancedOrder(orderData)
      
      if (result.orderId) {
        setOrderStatus({
          ...orderData,
          id: result.orderId,
          status: result.status,
          createdAt: new Date() as any // Will be properly typed when saved to Firestore
        })
        
        // Store unsubscribe function
        if (result.unsubscribe) {
          setUnsubscribeFunctions(prev => [...prev, result.unsubscribe!])
        }

        if (result.status === 'multi_shop_selection') {
          setCurrentStep('shop_selection')
          toast({
            title: "Order Placed!",
            description: "Your order has been sent to vendors. Please wait for responses.",
          })
        } else if (result.status === 'accepted') {
          setCurrentStep('tracking')
          toast({
            title: "Order Accepted!",
            description: "Your order has been accepted and is being prepared.",
          })
        } else {
          setCurrentStep('order_placed')
          toast({
            title: "Order Placed!",
            description: "Your order has been placed successfully.",
          })
        }
      }
    } catch (err) {
      console.error('Error placing order:', err)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle vendor response
  const handleVendorResponse = (response: any) => {
    console.log('Vendor response received:', response)
    
    if (response.status === 'accepted') {
      setOrderStatus(prev => prev ? {
        ...prev,
        status: 'accepted',
        assignedShopId: response.shopId,
        estimatedReadyTime: Date.now() + (response.estimatedPreparationTime * 60000)
      } : null)
      
      setCurrentStep('tracking')
      toast({
        title: "Order Accepted!",
        description: `Your order has been accepted by ${response.shopName || 'a vendor'}.`,
      })
    } else if (response.status === 'rejected') {
      toast({
        title: "Order Rejected",
        description: `Order rejected: ${response.notes || 'Items not available'}`,
        variant: "destructive"
      })
    }
  }

  // Handle order acceptance
  const handleOrderAccepted = (shopId: string) => {
    setOrderStatus(prev => prev ? {
      ...prev,
      status: 'accepted',
      assignedShopId: shopId
    } : null)
    setCurrentStep('tracking')
  }

  // Handle order rejection
  const handleOrderRejected = (shopId: string, reason: string) => {
    toast({
      title: "Order Rejected",
      description: `Order rejected: ${reason}`,
      variant: "destructive"
    })
  }

  // Handle new order
  const handleNewOrder = () => {
    setCurrentStep('route')
    setOrderStatus(null)
    setSelectedShops([])
    setUnsubscribeFunctions([])
  }

  // Handle location update
  const handleLocationUpdate = (location: LocationUpdate) => {
    updateLocation(location)
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'route':
        return (
          <RoutePlanner 
            onRouteSet={handleRouteSet} 
            userLocation={userLocation}
            onLocationUpdate={handleLocationUpdate}
          />
        )

      case 'shopping':
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Shopping</h1>
                <p className="text-gray-600">Add items to your cart and proceed to shop selection</p>
              </div>
              
              {/* Shopping interface would go here */}
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-center text-gray-500">
                  Shopping interface will be integrated here. For now, you can proceed to shop selection.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setCurrentStep('shop_selection')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Proceed to Shop Selection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'shop_selection':
        return (
          <ShopSelectionMap
            shops={availableShops}
            userRoute={userRoute!}
            onShopSelect={handleShopSelect}
            selectedShopIds={selectedShops}
            allowMultiSelect={true}
            onRouteUpdate={setUserRoute}
          />
        )

      case 'order_placed':
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
                <p className="text-gray-600">Your order has been sent to vendors. Please wait for responses.</p>
              </div>
              
              {orderStatus && (
                <VendorNotificationHandler
                  orderId={orderStatus.id!}
                  onVendorResponse={handleVendorResponse}
                  onOrderAccepted={handleOrderAccepted}
                  onOrderRejected={handleOrderRejected}
                />
              )}
            </div>
          </div>
        )

      case 'tracking':
        return orderStatus ? (
          <OrderStatusTracker
            orderId={orderStatus.id!}
            order={orderStatus}
            onLocationUpdate={handleLocationUpdate}
            onNewOrder={handleNewOrder}
          />
        ) : null

      default:
        return null
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderCurrentStep()}
    </div>
  )
}
