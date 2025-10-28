// app/grocery/page.tsx - Enhanced grocery shopping page with store type detection and vendor processing

'use client'

import React, { useState, useEffect } from 'react'
import { useEnhancedOrderProcessing } from '@/hooks/useEnhancedOrderProcessing'
import RoutePlanner from '@/components/RoutePlanner'
import EnhancedGroceryShopping from '@/components/EnhancedGroceryShopping'
import OrderProcessingStatus from '@/components/OrderProcessingStatus'
import { ProcessedOrder, UserRouteData, LocationUpdate, VendorResponse } from '@/types/grocery-advanced'
import { auth } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

type Step = 'route' | 'shopping' | 'order_processing' | 'tracking'

export default function GroceryPage() {
  const [currentStep, setCurrentStep] = useState<Step>('route')
  const [orderStatus, setOrderStatus] = useState<ProcessedOrder | null>(null)
  const [vendorResponses, setVendorResponses] = useState<VendorResponse[]>([])
  const [selectedVendor, setSelectedVendor] = useState<VendorResponse | null>(null)
  const [userRoute, setUserRoute] = useState<UserRouteData | null>(null)
  const [unsubscribeFunctions, setUnsubscribeFunctions] = useState<(() => void)[]>([])
  
  const { toast } = useToast()
  const user = auth?.currentUser

  const {
    currentOrder,
    placeProcessedOrder,
    acceptVendorResponse,
    vendorResponses: hookVendorResponses,
    selectedVendor: hookSelectedVendor,
    refreshVendorResponses,
    refreshProcessedOrder,
    loading,
    error,
    setError
  } = useEnhancedOrderProcessing()

  // Update local state when hook state changes
  useEffect(() => {
    if (currentOrder) {
      setOrderStatus(currentOrder)
    }
  }, [currentOrder])

  useEffect(() => {
    setVendorResponses(hookVendorResponses)
  }, [hookVendorResponses])

  useEffect(() => {
    setSelectedVendor(hookSelectedVendor)
  }, [hookSelectedVendor])

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

  // Handle order placement
  const handleOrderPlaced = async (orderId: string) => {
    try {
      setCurrentStep('order_processing')
      toast({
        title: "Order Placed!",
        description: "Your order has been sent to vendors for processing.",
      })
    } catch (err) {
      console.error('Error handling order placement:', err)
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle vendor acceptance
  const handleAcceptVendor = async (vendorResponse: VendorResponse) => {
    try {
      await acceptVendorResponse(vendorResponse)
      setCurrentStep('tracking')
      toast({
        title: "Vendor Selected!",
        description: `Your order has been accepted by ${vendorResponse.shopId}.`,
      })
    } catch (err) {
      console.error('Error accepting vendor:', err)
      toast({
        title: "Error",
        description: "Failed to accept vendor. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle order rejection
  const handleOrderRejected = () => {
    setCurrentStep('shopping')
    toast({
      title: "Order Rejected",
      description: "No vendors could fulfill your order. Please try again.",
      variant: "destructive"
    })
  }

  // Handle new order
  const handleNewOrder = () => {
    setCurrentStep('route')
    setOrderStatus(null)
    setVendorResponses([])
    setSelectedVendor(null)
    setUnsubscribeFunctions([])
  }

  // Handle location update
  const handleLocationUpdate = (location: LocationUpdate) => {
    // Location update logic can be added here if needed
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'route':
        return (
          <RoutePlanner 
            onRouteSet={handleRouteSet} 
            userLocation={null}
            onLocationUpdate={handleLocationUpdate}
          />
        )

      case 'shopping':
        return (
          <EnhancedGroceryShopping
            userRoute={userRoute} // Pass the actual route data
            onOrderPlaced={handleOrderPlaced}
          />
        )

      case 'order_processing':
        return orderStatus ? (
          <OrderProcessingStatus
            order={orderStatus}
            vendorResponses={vendorResponses}
            onAcceptVendor={handleAcceptVendor}
            onRejectOrder={handleOrderRejected}
            selectedVendor={selectedVendor}
          />
        ) : (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing order...</p>
            </div>
          </div>
        )

      case 'tracking':
        return orderStatus ? (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Tracking</h1>
                <p className="text-gray-600">Track your order status and location</p>
              </div>
              
              <OrderProcessingStatus
                order={orderStatus}
                vendorResponses={vendorResponses}
                onAcceptVendor={handleAcceptVendor}
                onRejectOrder={handleOrderRejected}
                selectedVendor={selectedVendor}
              />
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleNewOrder}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Place New Order
                </button>
              </div>
            </div>
          </div>
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
