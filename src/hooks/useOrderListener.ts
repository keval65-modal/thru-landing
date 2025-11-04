import { useEffect, useState, useCallback } from 'react'
import { supabaseRealtimeService, type OrderUpdate, type VendorResponseUpdate } from '@/lib/supabase/realtime-service'
import { useToast } from './use-toast'

/**
 * Hook to listen to a specific order's updates in real-time
 * NOW USING SUPABASE REALTIME! 🎉
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

    console.log('📡 Subscribing to Supabase Realtime for order:', orderId)
    setLoading(true)
    setError(null)

    // Subscribe to order updates via Supabase Realtime
    const unsubscribeOrder = supabaseRealtimeService.subscribeToOrder(
      orderId,
      (orderUpdate) => {
        console.log('📦 Supabase order update received:', orderUpdate)
        setOrder(orderUpdate)
        setLoading(false)
        
        // Show toast for status changes
        if (orderUpdate.status === 'confirmed') {
          toast({
            title: "Order Confirmed! 🎉",
            description: "A vendor has confirmed your order",
          })
        } else if (orderUpdate.status === 'preparing') {
          toast({
            title: "Order Preparing",
            description: "Your order is being prepared",
          })
        } else if (orderUpdate.status === 'completed') {
          toast({
            title: "Order Completed! ✅",
            description: "Your order is ready",
          })
        }
      },
      (err) => {
        console.error('❌ Supabase order listener error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // Subscribe to vendor responses via Supabase Realtime
    const unsubscribeResponses = supabaseRealtimeService.subscribeToVendorResponses(
      orderId,
      (response) => {
        console.log('🏪 Supabase vendor response received:', response)
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
        console.error('❌ Supabase vendor response listener error:', err)
      }
    )

    return () => {
      console.log('🧹 Cleaning up Supabase Realtime subscriptions')
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
 * NOW USING SUPABASE REALTIME! 🎉
 */
export function useUserOrders(userId: string | null, options?: { status?: string; limit?: number }) {
  const [orders, setOrders] = useState<OrderUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    console.log('📡 Subscribing to Supabase Realtime for user orders:', userId)
    setLoading(true)

    const unsubscribe = supabaseRealtimeService.subscribeToUserOrders(
      userId,
      (updatedOrders) => {
        console.log(`📦 Received ${updatedOrders.length} orders from Supabase Realtime`)
        setOrders(updatedOrders)
        setLoading(false)
      },
      options
    )

    return () => {
      console.log('🧹 Cleaning up user orders subscription')
      unsubscribe()
    }
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



