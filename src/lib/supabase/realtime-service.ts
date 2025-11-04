/**
 * Supabase Realtime Service
 * Replaces Firebase real-time listeners with Supabase Realtime
 */

import { getSupabaseClient } from './client'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { Order, VendorQuote } from './order-service'

export interface OrderUpdate {
  orderId: string
  status: string
  vendorQuotes?: VendorQuote[]
  updatedAt: Date
  createdAt: Date
  items?: any[]
  route?: any
  userId?: string
  totalAmount?: number
  selectedVendorId?: string
}

export interface VendorResponseUpdate {
  orderId: string
  vendorId: string
  vendorName: string
  status: 'accepted' | 'rejected' | 'counter_offer'
  totalPrice?: number
  estimatedReadyTime?: string
  notes?: string
  counterOffer?: any
  responseTime: string
}

export class SupabaseRealtimeService {
  private channels: RealtimeChannel[] = []

  /**
   * Subscribe to real-time updates for a specific order
   */
  subscribeToOrder(
    orderId: string,
    onUpdate: (order: OrderUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('📦 Order update received:', payload)

          try {
            const data = payload.new as any
            const order: OrderUpdate = {
              orderId: data.id,
              status: data.status,
              vendorQuotes: data.vendor_quotes || [],
              updatedAt: new Date(data.updated_at),
              createdAt: new Date(data.created_at),
              items: data.items,
              route: data.route,
              userId: data.user_id,
              totalAmount: data.total_amount,
              selectedVendorId: data.selected_vendor_id,
            }

            onUpdate(order)
          } catch (error) {
            console.error('Error processing order update:', error)
            onError?.(
              error instanceof Error ? error : new Error('Unknown error')
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to order: ${orderId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for order: ${orderId}`)
          onError?.(new Error('Channel subscription failed'))
        }
      })

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
      this.channels = this.channels.filter((ch) => ch !== channel)
    }
  }

  /**
   * Subscribe to vendor responses for an order
   */
  subscribeToVendorResponses(
    orderId: string,
    onResponse: (response: VendorResponseUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel(`vendor_responses:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendor_responses',
          filter: `order_id=eq.${orderId}`,
        },
        async (payload) => {
          console.log('🏪 Vendor response received:', payload)

          try {
            const data = payload.new as any

            // Fetch vendor name
            const { data: vendor } = await supabase
              .from('vendors')
              .select('name')
              .eq('id', data.vendor_id)
              .single()

            const response: VendorResponseUpdate = {
              orderId: data.order_id,
              vendorId: data.vendor_id,
              vendorName: vendor?.name || 'Unknown Vendor',
              status: data.status,
              totalPrice: data.total_price,
              estimatedReadyTime: data.estimated_ready_time,
              notes: data.notes,
              counterOffer: data.counter_offer,
              responseTime: data.responded_at,
            }

            onResponse(response)
          } catch (error) {
            console.error('Error processing vendor response:', error)
            onError?.(
              error instanceof Error ? error : new Error('Unknown error')
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to vendor responses for order: ${orderId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for vendor responses: ${orderId}`)
          onError?.(new Error('Channel subscription failed'))
        }
      })

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
      this.channels = this.channels.filter((ch) => ch !== channel)
    }
  }

  /**
   * Subscribe to all orders for a user
   */
  subscribeToUserOrders(
    userId: string,
    onUpdate: (orders: OrderUpdate[]) => void,
    options?: { status?: string; limit?: number }
  ): () => void {
    const supabase = getSupabaseClient()

    const fetchOrders = async () => {
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (options?.status) {
          query = query.eq('status', options.status)
        }

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) throw error

        const orders: OrderUpdate[] = data.map((order) => ({
          orderId: order.id,
          status: order.status,
          vendorQuotes: order.vendor_quotes || [],
          updatedAt: new Date(order.updated_at),
          createdAt: new Date(order.created_at),
          items: order.items,
          route: order.route,
          userId: order.user_id,
          totalAmount: order.total_amount,
          selectedVendorId: order.selected_vendor_id,
        }))

        onUpdate(orders)
      } catch (error) {
        console.error('Error fetching orders:', error)
      }
    }

    // Initial fetch
    fetchOrders()

    const channel = supabase
      .channel(`user_orders:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch all orders when any change occurs
          fetchOrders()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to user orders: ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for user orders: ${userId}`)
        }
      })

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
      this.channels = this.channels.filter((ch) => ch !== channel)
    }
  }

  /**
   * Subscribe to vendors (for admin/vendor app)
   */
  subscribeToVendors(
    onUpdate: (vendors: any[]) => void,
    filters?: { storeType?: string; active?: boolean }
  ): () => void {
    const supabase = getSupabaseClient()

    const fetchVendors = async () => {
      try {
        let query = supabase.from('vendors').select('*')

        if (filters?.active !== undefined) {
          query = query.eq('is_active', filters.active)
        }

        if (filters?.storeType) {
          query = query.eq('store_type', filters.storeType)
        }

        const { data, error } = await query

        if (error) throw error

        onUpdate(data || [])
      } catch (error) {
        console.error('Error fetching vendors:', error)
      }
    }

    // Initial fetch
    fetchVendors()

    const channel = supabase
      .channel('vendors')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors',
        },
        () => {
          fetchVendors()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to vendors')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error for vendors')
        }
      })

    this.channels.push(channel)

    return () => {
      supabase.removeChannel(channel)
      this.channels = this.channels.filter((ch) => ch !== channel)
    }
  }

  /**
   * Clean up all active listeners
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.channels.length} listeners`)
    const supabase = getSupabaseClient()
    this.channels.forEach((channel) => supabase.removeChannel(channel))
    this.channels = []
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptionsCount(): number {
    return this.channels.length
  }
}

// Singleton instance
export const supabaseRealtimeService = new SupabaseRealtimeService()



