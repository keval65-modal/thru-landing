import { db } from './firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore'

export interface VendorResponse {
  orderId: string
  vendorId: string
  status: 'accepted' | 'rejected' | 'preparing' | 'ready'
  notes?: string
  estimatedReadyTime?: number
  respondedAt: Timestamp
}

export class VendorResponseHandler {
  private unsubscribeFunctions: (() => void)[] = []

  // Listen for vendor responses to a specific order
  subscribeToVendorResponses(
    orderId: string,
    onResponse: (response: VendorResponse) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const q = query(
      collection(db, 'vendor_responses'),
      where('orderId', '==', orderId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const response = {
              id: change.doc.id,
              ...change.doc.data()
            } as VendorResponse & { id: string }
            
            onResponse(response)
          }
        })
      },
      (error) => {
        console.error('Error listening to vendor responses:', error)
        onError?.(error)
      }
    )

    this.unsubscribeFunctions.push(unsubscribe)
    return unsubscribe
  }

  // Update order status based on vendor response
  async updateOrderStatus(
    orderId: string,
    vendorId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized')
    }

    try {
      // Update the specific vendor portion in the order
      const orderRef = doc(db, 'orders', orderId)
      
      // Get current order data
      const orderDoc = await import('firebase/firestore').then(fs => fs.getDoc(orderRef))
      if (!orderDoc.exists()) {
        throw new Error('Order not found')
      }

      const orderData = orderDoc.data()
      const updatedVendorPortions = orderData.vendorPortions.map((portion: any) => {
        if (portion.vendorId === vendorId) {
          return {
            ...portion,
            status: status,
            notes: notes || portion.notes,
            updatedAt: Timestamp.now()
          }
        }
        return portion
      })

      // Update overall order status based on vendor responses
      let overallStatus = orderData.overallStatus
      if (status === 'accepted') {
        overallStatus = 'Accepted'
      } else if (status === 'rejected') {
        // Check if all vendors rejected
        const allRejected = updatedVendorPortions.every((p: any) => p.status === 'rejected')
        if (allRejected) {
          overallStatus = 'Cancelled'
        }
      } else if (status === 'ready') {
        overallStatus = 'Ready for Pickup'
      }

      await updateDoc(orderRef, {
        vendorPortions: updatedVendorPortions,
        overallStatus: overallStatus,
        updatedAt: Timestamp.now()
      })

      console.log(`Order ${orderId} updated: vendor ${vendorId} status changed to ${status}`)
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  // Clean up all listeners
  cleanup(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    this.unsubscribeFunctions = []
  }
}

export const vendorResponseHandler = new VendorResponseHandler()
