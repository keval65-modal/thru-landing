import { useEffect, useState, useCallback } from 'react'
import { orderListenerService, type OrderUpdate, type VendorResponseUpdate } from '@/lib/order-listener-service'
import { useToast } from './use-toast'

/**
 * Hook to listen to a specific order's updates in real-time
 */
export function useOrderListener(orderId: string | null) {
  const [order, setOrder] = useState<OrderUpdate | null>(null)
  const [vendorResponses, setVendorResponses] = useState<VendorResponseUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Subscribe to order updates
    const unsubscribeOrder = orderListenerService.subscribeToOrder(
      orderId,
      (orderUpdate) => {
        setOrder(orderUpdate)
        setLoading(false)
        
        // Show toast for status changes
        if (orderUpdate.status === 'vendor_accepted') {
          toast({
            title: "Order Accepted! 🎉",
            description: "A vendor has accepted your order",
          })
        } else if (orderUpdate.status === 'vendor_rejected') {
          toast({
            title: "Order Update",
            description: "Vendor response received",
            variant: "destructive"
          })
        }
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    // Subscribe to vendor responses
    const unsubscribeResponses = orderListenerService.subscribeToVendorResponses(
      orderId,
      (response) => {
        setVendorResponses(prev => {
          const existing = prev.find(r => r.vendorId === response.vendorId)
          if (existing) {
            return prev.map(r => r.vendorId === response.vendorId ? response : r)
          }
          return [...prev, response]
        })

        // Show detailed toast for vendor responses
        if (response.status === 'accepted') {
          toast({
            title: `${response.vendorName} Accepted! ✅`,
            description: response.estimatedReadyTime 
              ? `Ready in ${response.estimatedReadyTime}` 
              : 'Your order has been accepted',
          })
        } else if (response.status === 'rejected') {
          toast({
            title: `${response.vendorName} - Order Update`,
            description: response.notes || 'Vendor has responded to your order',
            variant: "destructive"
          })
        }
      },
      (err) => {
        console.error('Error in vendor responses:', err)
      }
    )

    return () => {
      unsubscribeOrder()
      unsubscribeResponses()
    }
  }, [orderId, toast])

  return {
    order,
    vendorResponses,
    loading,
    error
  }
}

/**
 * Hook to listen to all orders for the current user
 */
export function useUserOrders(userId: string | null, options?: { status?: string; limit?: number }) {
  const [orders, setOrders] = useState<OrderUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = orderListenerService.subscribeToUserOrders(
      userId,
      (updatedOrders) => {
        setOrders(updatedOrders)
        setLoading(false)
      },
      options
    )

    return () => unsubscribe()
  }, [userId, options?.status, options?.limit])

  return {
    orders,
    loading
  }
}

/**
 * Hook for manual order refresh (useful for pull-to-refresh)
 */
export function useOrderRefresh() {
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    // Just wait a moment - the real-time listeners will update automatically
    await new Promise(resolve => setTimeout(resolve, 500))
    setRefreshing(false)
  }, [])

  return {
    refreshing,
    refresh
  }
}

