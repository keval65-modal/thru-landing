/**
 * Order Service - Supabase Version
 * Handles all order operations using Supabase PostgreSQL
 */

import { getSupabaseClient } from './client'
import { createServiceSupabaseClient } from './server'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  category?: string
}

export interface RouteInfo {
  startLocation: { lat: number; lng: number; address?: string }
  endLocation: { lat: number; lng: number; address?: string }
  distance?: string
  duration?: string
  polyline?: string
}

export interface DetourPreferences {
  maxDetourDistance: number
  preferredStoreTypes: string[]
  singleStorePreferred: boolean
}

export interface VendorQuote {
  vendorId: string
  vendorName: string
  totalPrice: number
  itemPrices: { [itemId: string]: number }
  estimatedReadyTime: string
  notes?: string
  respondedAt: Date
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  route: RouteInfo
  detourPreferences: DetourPreferences
  status: string
  vendorQuotes: VendorQuote[]
  selectedVendorId?: string
  totalAmount?: number
  createdAt: Date
  updatedAt: Date
  quoteDeadline?: Date
}

export class SupabaseOrderService {
  /**
   * Create a new order
   */
  static async createOrder(orderData: {
    userId: string
    items: OrderItem[]
    route: RouteInfo
    detourPreferences: DetourPreferences
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const supabase = getSupabaseClient()

      const order = {
        user_id: orderData.userId,
        items: orderData.items,
        route: orderData.route,
        detour_preferences: orderData.detourPreferences,
        status: 'pending_quotes',
        vendor_quotes: [],
        quote_deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }

      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Order created: ${data.id}`)

      // TODO: Notify vendors (via API or Edge Function)
      await this.notifyVendorsForQuotes(data.id, orderData)

      return {
        success: true,
        orderId: data.id,
      }
    } catch (error) {
      console.error('Error creating order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      }
    }
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error

      return this.mapOrderFromDb(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  /**
   * Get user orders
   */
  static async getUserOrders(
    userId: string,
    options?: {
      status?: string
      limit?: number
    }
  ): Promise<Order[]> {
    try {
      const supabase = getSupabaseClient()

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

      return data.map(this.mapOrderFromDb)
    } catch (error) {
      console.error('Error fetching user orders:', error)
      return []
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    updates?: Partial<{
      selectedVendorId: string
      totalAmount: number
      vendorQuotes: VendorQuote[]
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const updateData: any = {
        status,
        ...updates,
      }

      // Convert camelCase to snake_case for database
      if (updates?.selectedVendorId) {
        updateData.selected_vendor_id = updates.selectedVendorId
        delete updateData.selectedVendorId
      }
      if (updates?.totalAmount) {
        updateData.total_amount = updates.totalAmount
        delete updateData.totalAmount
      }
      if (updates?.vendorQuotes) {
        updateData.vendor_quotes = updates.vendorQuotes
        delete updateData.vendorQuotes
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
      }
    }
  }

  /**
   * Add vendor quote to order
   */
  static async addVendorQuote(
    orderId: string,
    quote: VendorQuote
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current order
      const order = await this.getOrder(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      // Add new quote
      const updatedQuotes = [...order.vendorQuotes, quote]

      // Update order
      return await this.updateOrderStatus(orderId, order.status, {
        vendorQuotes: updatedQuotes,
      })
    } catch (error) {
      console.error('Error adding vendor quote:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add quote',
      }
    }
  }

  /**
   * Select vendor and confirm order
   */
  static async selectVendor(
    orderId: string,
    vendorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get order to find selected quote
      const order = await this.getOrder(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      const selectedQuote = order.vendorQuotes.find(
        (q) => q.vendorId === vendorId
      )
      if (!selectedQuote) {
        throw new Error('Vendor quote not found')
      }

      // Update order with selected vendor
      return await this.updateOrderStatus(orderId, 'confirmed', {
        selectedVendorId: vendorId,
        totalAmount: selectedQuote.totalPrice,
      })
    } catch (error) {
      console.error('Error selecting vendor:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select vendor',
      }
    }
  }

  /**
   * Delete order (admin only)
   */
  static async deleteOrder(
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const { error } = await supabase.from('orders').delete().eq('id', orderId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order',
      }
    }
  }

  /**
   * Map database record to Order interface
   */
  private static mapOrderFromDb(data: any): Order {
    return {
      id: data.id,
      userId: data.user_id,
      items: data.items,
      route: data.route,
      detourPreferences: data.detour_preferences,
      status: data.status,
      vendorQuotes: data.vendor_quotes || [],
      selectedVendorId: data.selected_vendor_id,
      totalAmount: data.total_amount,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      quoteDeadline: data.quote_deadline
        ? new Date(data.quote_deadline)
        : undefined,
    }
  }

  /**
   * Notify vendors about new order (placeholder)
   * Implement via API call to vendor app or Edge Function
   */
  private static async notifyVendorsForQuotes(
    orderId: string,
    orderData: {
      userId: string
      items: OrderItem[]
      route: RouteInfo
      detourPreferences: DetourPreferences
    }
  ): Promise<void> {
    try {
      // Call vendor API to notify about new order
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_VENDOR_API_URL}/orders/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            ...orderData,
          }),
        }
      )

      if (!response.ok) {
        console.warn('Failed to notify vendors:', await response.text())
      } else {
        console.log('✅ Vendors notified for order:', orderId)
      }
    } catch (error) {
      console.error('Error notifying vendors:', error)
      // Don't throw - order creation should succeed even if notification fails
    }
  }
}



