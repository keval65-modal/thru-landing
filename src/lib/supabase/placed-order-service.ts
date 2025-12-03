/**
 * Placed Order Service - Supabase Version
 * Handles direct order placement using Supabase PostgreSQL
 */

import { getSupabaseClient } from './client'
import { createServiceSupabaseClient } from './server'
import type { PlacedOrder, VendorOrderPortion } from '../orderModels'

export class SupabasePlacedOrderService {
  /**
   * Create a new placed order
   */
  static async createOrder(orderData: PlacedOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const supabase = getSupabaseClient()

      const order = {
        order_id: orderData.orderId,
        customer_info: orderData.customerInfo,
        trip_start_location: orderData.tripStartLocation,
        trip_destination: orderData.tripDestination,
        overall_status: orderData.overallStatus,
        payment_status: orderData.paymentStatus,
        grand_total: orderData.grandTotal,
        platform_fee: orderData.platformFee || 0,
        payment_gateway_fee: orderData.paymentGatewayFee || 0,
        vendor_portions: orderData.vendorPortions,
        vendor_ids: orderData.vendorIds,
      }

      const { data, error } = await supabase
        .from('placed_orders')
        .insert(order)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Order created in Supabase: ${data.order_id}`)

      return {
        success: true,
        orderId: data.order_id,
      }
    } catch (error) {
      console.error('Error creating order in Supabase:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      }
    }
  }

  /**
   * Get order by order ID
   */
  static async getOrder(orderId: string): Promise<PlacedOrder | null> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('placed_orders')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (error) throw error

      return this.mapOrderFromDb(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  /**
   * Get orders for a specific vendor
   */
  static async getVendorOrders(
    vendorId: string,
    options?: {
      status?: string[]
      limit?: number
    }
  ): Promise<PlacedOrder[]> {
    try {
      const supabase = getSupabaseClient()

      let query = supabase
        .from('placed_orders')
        .select('*')
        .contains('vendor_ids', [vendorId])
        .order('created_at', { ascending: false })

      if (options?.status && options.status.length > 0) {
        query = query.in('overall_status', options.status)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapOrderFromDb)
    } catch (error) {
      console.error('Error fetching vendor orders:', error)
      return []
    }
  }

  /**
   * Update vendor portion status
   */
  static async updateVendorPortionStatus(
    orderId: string,
    vendorId: string,
    status: string,
    prepTime?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      // Get current order
      const order = await this.getOrder(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      // Update the specific vendor portion
      const updatedPortions = order.vendorPortions.map((portion) => {
        if (portion.vendorId === vendorId) {
          return {
            ...portion,
            status,
            ...(prepTime !== undefined && { prepTime }),
          }
        }
        return portion
      })

      // Update overall status based on vendor portions
      let overallStatus = order.overallStatus
      const allReady = updatedPortions.every((p) => p.status === 'Ready for Pickup')
      const anyPreparing = updatedPortions.some((p) => p.status === 'Preparing')

      if (allReady) {
        overallStatus = 'Ready for Pickup'
      } else if (anyPreparing) {
        overallStatus = 'In Progress'
      }

      // Update in database
      const { error } = await supabase
        .from('placed_orders')
        .update({
          vendor_portions: updatedPortions,
          overall_status: overallStatus,
        })
        .eq('order_id', orderId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating vendor portion status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      }
    }
  }

  /**
   * Subscribe to vendor orders in real-time
   */
  static subscribeToVendorOrders(
    vendorId: string,
    callback: (orders: PlacedOrder[]) => void
  ): () => void {
    const supabase = getSupabaseClient()

    // Initial fetch
    this.getVendorOrders(vendorId, {
      status: ['New', 'Confirmed', 'In Progress', 'Ready for Pickup', 'Pending Confirmation'],
    }).then(callback)

    // Subscribe to changes
    const subscription = supabase
      .channel('vendor_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'placed_orders',
          filter: `vendor_ids=cs.{${vendorId}}`,
        },
        async () => {
          // Refetch orders when changes occur
          const orders = await this.getVendorOrders(vendorId, {
            status: ['New', 'Confirmed', 'In Progress', 'Ready for Pickup', 'Pending Confirmation'],
          })
          callback(orders)
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
    }
  }

  /**
   * Map database record to PlacedOrder interface
   */
  private static mapOrderFromDb(data: any): PlacedOrder {
    return {
      id: data.id,
      orderId: data.order_id,
      customerInfo: data.customer_info,
      tripStartLocation: data.trip_start_location,
      tripDestination: data.trip_destination,
      createdAt: data.created_at,
      overallStatus: data.overall_status,
      paymentStatus: data.payment_status,
      grandTotal: parseFloat(data.grand_total),
      platformFee: parseFloat(data.platform_fee || 0),
      paymentGatewayFee: parseFloat(data.payment_gateway_fee || 0),
      vendorPortions: data.vendor_portions,
      vendorIds: data.vendor_ids,
    }
  }
}
