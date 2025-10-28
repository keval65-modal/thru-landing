import { db } from './firebase'
import { doc, onSnapshot, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore'

export interface OrderUpdate {
  orderId: string
  status: string
  vendorResponses?: {
    [vendorId: string]: {
      status: 'accepted' | 'rejected' | 'counter_offer'
      totalPrice?: number
      estimatedReadyTime?: string
      notes?: string
      respondedAt: Date
    }
  }
  updatedAt: Date
  createdAt: Date
  items?: any[]
  route?: any
  userId?: string
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

export class OrderListenerService {
  private unsubscribeFunctions: (() => void)[] = []

  /**
   * Subscribe to real-time updates for a specific grocery order
   */
  subscribeToOrder(
    orderId: string,
    onUpdate: (order: OrderUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const orderRef = doc(db, 'groceryOrders', orderId)
    
    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          const order: OrderUpdate = {
            orderId: snapshot.id,
            status: data.status || 'pending',
            vendorResponses: data.vendorResponses || {},
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            items: data.items || [],
            route: data.route || {},
            userId: data.userId || ''
          }
          
          console.log('📦 Order update received:', order)
          onUpdate(order)
        }
      },
      (error) => {
        console.error('❌ Error listening to order:', error)
        onError?.(error)
      }
    )

    this.unsubscribeFunctions.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Subscribe to all vendor responses for a specific order
   */
  subscribeToVendorResponses(
    orderId: string,
    onResponse: (response: VendorResponseUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const q = query(
      collection(db, 'vendor_responses'),
      where('orderId', '==', orderId),
      orderBy('responseTime', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data()
            const response: VendorResponseUpdate = {
              orderId: data.orderId,
              vendorId: data.vendorId,
              vendorName: data.vendorName || 'Unknown Vendor',
              status: data.status,
              totalPrice: data.totalPrice,
              estimatedReadyTime: data.estimatedReadyTime,
              notes: data.notes,
              counterOffer: data.counterOffer,
              responseTime: data.responseTime
            }
            
            console.log('📨 Vendor response received:', response)
            onResponse(response)
          }
        })
      },
      (error) => {
        console.error('❌ Error listening to vendor responses:', error)
        onError?.(error)
      }
    )

    this.unsubscribeFunctions.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Subscribe to all orders for a specific user
   */
  subscribeToUserOrders(
    userId: string,
    onUpdate: (orders: OrderUpdate[]) => void,
    options?: {
      status?: string
      limit?: number
    }
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    let q = query(
      collection(db, 'groceryOrders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    if (options?.status) {
      q = query(q, where('status', '==', options.status))
    }

    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit))
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders: OrderUpdate[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            orderId: doc.id,
            status: data.status || 'pending',
            vendorResponses: data.vendorResponses || {},
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            items: data.items || [],
            route: data.route || {},
            userId: data.userId || ''
          }
        })
        
        console.log(`📦 ${orders.length} orders loaded for user ${userId}`)
        onUpdate(orders)
      },
      (error) => {
        console.error('❌ Error listening to user orders:', error)
      }
    )

    this.unsubscribeFunctions.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Clean up all active listeners
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.unsubscribeFunctions.length} listeners`)
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    this.unsubscribeFunctions = []
  }
}

// Export singleton instance
export const orderListenerService = new OrderListenerService()

