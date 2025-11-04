/**
 * Production Order Service
 * Handles quote-based ordering workflow for real users
 */

import { db } from './firebase'
import { adminDb } from './firebaseAdmin'
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  category?: string
}

export interface RouteInfo {
  startLocation: {
    latitude: number
    longitude: number
    address: string
  }
  endLocation: {
    latitude: number
    longitude: number
    address: string
  }
  departureTime?: string
}

export interface DetourPreferences {
  maxDetourKm: number
  maxDetourMinutes: number
}

export interface VendorQuote {
  vendorId: string
  vendorName: string
  status: 'quoted' | 'declined'
  itemQuotes: ItemQuote[]
  unavailableItems: string[] // Item IDs that vendor doesn't have
  totalPrice: number
  estimatedReadyTime: string
  notes?: string
  quotedAt: Date
}

export interface ItemQuote {
  itemId: string
  itemName: string
  available: boolean
  pricePerUnit: number
  quantity: number
  totalPrice: number
  unit: string
}

export interface ProductionOrder {
  id?: string
  userId: string
  items: OrderItem[]
  route: RouteInfo
  detourPreferences: DetourPreferences
  status: 'pending_quotes' | 'quotes_received' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  vendorQuotes?: VendorQuote[]
  selectedVendorId?: string
  selectedQuote?: VendorQuote
  finalPrice?: number
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
  quoteDeadline?: Date | Timestamp
}

export class ProductionOrderService {
  /**
   * Create a new order (user creates without prices)
   */
  static async createOrder(orderData: {
    userId: string
    items: OrderItem[]
    route: RouteInfo
    detourPreferences: DetourPreferences
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Create order with pending_quotes status
      const order: Omit<ProductionOrder, 'id'> = {
        userId: orderData.userId,
        items: orderData.items,
        route: orderData.route,
        detourPreferences: orderData.detourPreferences,
        status: 'pending_quotes',
        vendorQuotes: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        quoteDeadline: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)) // 5 minutes
      }

      const orderRef = await addDoc(collection(db, 'groceryOrders'), order)
      console.log(`✅ Order created: ${orderRef.id}`)

      // Find vendors along route and notify them
      await this.notifyVendorsForQuotes(orderRef.id, orderData)

      return {
        success: true,
        orderId: orderRef.id
      }
    } catch (error) {
      console.error('Error creating order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order'
      }
    }
  }

  /**
   * Find vendors along route and send quote requests
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
      // Use admin SDK if available, otherwise client SDK
      const firestoreDb = typeof window === 'undefined' ? adminDb() : db
      if (!firestoreDb) return

      // Find vendors along the route
      const vendorsRef = collection(firestoreDb as any, 'vendors')
      const vendorsSnapshot = await getDocs(vendorsRef)

      const eligibleVendors: any[] = []

      vendorsSnapshot.forEach((doc) => {
        const vendor = doc.data()
        
        // Filter criteria
        const isActive = vendor.isActive === true || vendor.status === 'active'
        const hasGrocery = vendor.groceryEnabled === true || vendor.storeCategory === 'grocery'
        const hasLocation = vendor.latitude && vendor.longitude

        if (isActive && hasGrocery && hasLocation) {
          // Calculate if vendor is on route (simplified)
          const detourKm = this.calculateDetour(
            orderData.route.startLocation,
            { latitude: vendor.latitude, longitude: vendor.longitude }
          )

          if (detourKm <= orderData.detourPreferences.maxDetourKm) {
            eligibleVendors.push({
              id: doc.id,
              ...vendor,
              detourKm
            })
          }
        }
      })

      console.log(`📍 Found ${eligibleVendors.length} eligible vendors`)

      // Send quote request notification to each vendor
      for (const vendor of eligibleVendors) {
        await addDoc(collection(firestoreDb as any, 'vendor_notifications'), {
          vendorId: vendor.id,
          orderId,
          type: 'quote_request',
          userId: orderData.userId,
          items: orderData.items,
          route: orderData.route,
          detourKm: vendor.detourKm,
          quoteDeadline: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date(),
          read: false,
          priority: 'high'
        })
      }

      console.log(`📨 Sent quote requests to ${eligibleVendors.length} vendors`)
    } catch (error) {
      console.error('Error notifying vendors:', error)
    }
  }

  /**
   * Vendor submits quote
   */
  static async submitVendorQuote(quote: {
    orderId: string
    vendorId: string
    vendorName: string
    itemQuotes: ItemQuote[]
    unavailableItems: string[]
    estimatedReadyTime: string
    notes?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const firestoreDb = typeof window === 'undefined' ? adminDb() : db
      if (!firestoreDb) {
        throw new Error('Firestore not initialized')
      }

      // Calculate total price
      const totalPrice = quote.itemQuotes.reduce((sum, item) => sum + item.totalPrice, 0)

      const vendorQuote: VendorQuote = {
        vendorId: quote.vendorId,
        vendorName: quote.vendorName,
        status: 'quoted',
        itemQuotes: quote.itemQuotes,
        unavailableItems: quote.unavailableItems,
        totalPrice,
        estimatedReadyTime: quote.estimatedReadyTime,
        notes: quote.notes,
        quotedAt: new Date()
      }

      // Update order with vendor quote
      const orderRef = doc(firestoreDb as any, 'groceryOrders', quote.orderId)
      const orderDoc = await getDoc(orderRef)

      if (!orderDoc.exists()) {
        throw new Error('Order not found')
      }

      const orderData = orderDoc.data()
      const existingQuotes = orderData.vendorQuotes || []

      // Add or update quote
      const quoteIndex = existingQuotes.findIndex((q: VendorQuote) => q.vendorId === quote.vendorId)
      if (quoteIndex >= 0) {
        existingQuotes[quoteIndex] = vendorQuote
      } else {
        existingQuotes.push(vendorQuote)
      }

      await updateDoc(orderRef, {
        vendorQuotes: existingQuotes,
        status: 'quotes_received',
        updatedAt: Timestamp.now()
      })

      console.log(`✅ Quote submitted by ${quote.vendorName}`)

      return { success: true }
    } catch (error) {
      console.error('Error submitting quote:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit quote'
      }
    }
  }

  /**
   * User selects best vendor quote
   */
  static async selectVendorQuote(
    orderId: string,
    vendorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const orderRef = doc(db, 'groceryOrders', orderId)
      const orderDoc = await getDoc(orderRef)

      if (!orderDoc.exists()) {
        throw new Error('Order not found')
      }

      const orderData = orderDoc.data()
      const selectedQuote = orderData.vendorQuotes?.find((q: VendorQuote) => q.vendorId === vendorId)

      if (!selectedQuote) {
        throw new Error('Vendor quote not found')
      }

      // Update order with selected vendor
      await updateDoc(orderRef, {
        selectedVendorId: vendorId,
        selectedQuote,
        finalPrice: selectedQuote.totalPrice,
        status: 'confirmed',
        updatedAt: Timestamp.now()
      })

      // Notify selected vendor
      await addDoc(collection(db, 'vendor_notifications'), {
        vendorId,
        orderId,
        type: 'order_confirmed',
        message: 'Your quote was accepted! Please prepare the order',
        createdAt: new Date(),
        read: false,
        priority: 'high'
      })

      // Notify other vendors that order was fulfilled
      const otherVendors = orderData.vendorQuotes?.filter((q: VendorQuote) => q.vendorId !== vendorId) || []
      for (const vendor of otherVendors) {
        await addDoc(collection(db, 'vendor_notifications'), {
          vendorId: vendor.vendorId,
          orderId,
          type: 'order_fulfilled_by_other',
          message: 'This order was fulfilled by another vendor',
          createdAt: new Date(),
          read: false,
          priority: 'low'
        })
      }

      console.log(`✅ Order ${orderId} confirmed with vendor ${vendorId}`)

      return { success: true }
    } catch (error) {
      console.error('Error selecting vendor:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select vendor'
      }
    }
  }

  /**
   * Calculate detour distance (simplified Haversine)
   */
  private static calculateDetour(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * Math.PI / 180) *
      Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}



