// lib/grocery-firestore.ts - Direct Firestore access for grocery system

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore'
import { db } from './firebase'

export interface GroceryProduct {
  id: string
  product_name: string
  display_name: string
  pack_unit: string
  pack_value: number
  price: number
  sku_id: string
  source: string
  category?: string
  image_url?: string
  description?: string
  is_available?: boolean
  created_at?: Timestamp
  updated_at?: Timestamp
}

export interface GroceryShop {
  id: string
  shopName: string
  location: {
    latitude: number
    longitude: number
  }
  distance?: number
  rating?: number
  deliveryTime?: string
  isOpen?: boolean
  address?: string
  phone?: string
  email?: string
  businessHours?: {
    [key: string]: { open: string; close: string }
  }
  categories?: string[]
  isActiveOnThru?: boolean
}

export interface GroceryOrder {
  id?: string
  userId: string
  items: Array<{
    id: string
    product_name: string
    display_name: string
    pack_unit: string
    pack_value: number
    price: number
    sku_id: string
    source: string
    quantity: number
  }>
  selectedShopId: string
  userLocation: {
    latitude: number
    longitude: number
    address: string
  }
  totalAmount: number
  notes?: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  createdAt: Timestamp
  updatedAt: Timestamp
}

export class GroceryFirestoreService {
  private productsCollection = 'grocery-skus'
  private shopsCollection = 'vendors'
  private ordersCollection = 'grocery-orders'

  // Real-time product search with fuzzy matching
  async searchProducts(searchTerm: string, limitCount: number = 20): Promise<GroceryProduct[]> {
    try {
      if (!db) {
        console.warn('Firestore not initialized')
        return []
      }

      // Create a query for products that are available
      const q = query(
        collection(db, this.productsCollection),
        where('is_available', '==', true),
        orderBy('display_name'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      const products: GroceryProduct[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        products.push({
          id: doc.id,
          ...data,
          created_at: data.created_at,
          updated_at: data.updated_at
        } as GroceryProduct)
      })

      // Client-side fuzzy search filtering
      if (searchTerm.trim()) {
        return this.fuzzySearch(products, searchTerm)
      }

      return products
    } catch (error) {
      console.error('Error searching products:', error)
      return []
    }
  }

  // Real-time product listener for live updates
  subscribeToProducts(
    searchTerm: string, 
    limitCount: number, 
    onUpdate: (products: GroceryProduct[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const q = query(
      collection(db, this.productsCollection),
      where('is_available', '==', true),
      orderBy('display_name'),
      limit(limitCount)
    )

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const products: GroceryProduct[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        products.push({
          id: doc.id,
          ...data,
          created_at: data.created_at,
          updated_at: data.updated_at
        } as GroceryProduct)
      })

      // Apply fuzzy search if search term exists
      const filteredProducts = searchTerm.trim() 
        ? this.fuzzySearch(products, searchTerm)
        : products

      onUpdate(filteredProducts)
    }, (error) => {
      console.error('Error listening to products:', error)
      onUpdate([])
    })
  }

  // Find nearby grocery shops
  async findNearbyShops(lat: number, lng: number, maxDetour: number = 2): Promise<GroceryShop[]> {
    try {
      if (!db) {
        console.warn('Firestore not initialized')
        return []
      }

      // Query for active grocery shops
      const q = query(
        collection(db, this.shopsCollection),
        where('isActiveOnThru', '==', true),
        where('categories', 'array-contains', 'grocery')
      )

      const querySnapshot = await getDocs(q)
      const shops: GroceryShop[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const shopLat = data.coordinates?.lat || data.location?.latitude
        const shopLng = data.coordinates?.lng || data.location?.longitude

        if (shopLat && shopLng) {
          const distance = this.calculateDistance(lat, lng, shopLat, shopLng)
          
          if (distance <= maxDetour) {
            shops.push({
              id: doc.id,
              shopName: data.shopName || data.name,
              location: {
                latitude: shopLat,
                longitude: shopLng
              },
              distance,
              rating: data.rating,
              deliveryTime: data.deliveryTime || '15 min',
              isOpen: data.isOpen !== false,
              address: data.address,
              phone: data.phone,
              email: data.email,
              businessHours: data.businessHours,
              categories: data.categories || ['grocery'],
              isActiveOnThru: data.isActiveOnThru
            })
          }
        }
      })

      // Sort by distance
      return shops.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    } catch (error) {
      console.error('Error finding nearby shops:', error)
      return []
    }
  }

  // Place grocery order
  async placeOrder(orderData: Omit<GroceryOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      if (!db) {
        return { success: false, error: 'Firestore not initialized' }
      }

      const orderWithTimestamps: Omit<GroceryOrder, 'id'> = {
        ...orderData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, this.ordersCollection), orderWithTimestamps)
      
      return {
        success: true,
        orderId: docRef.id
      }
    } catch (error) {
      console.error('Error placing order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get user orders with real-time updates
  subscribeToUserOrders(
    userId: string, 
    onUpdate: (orders: GroceryOrder[]) => void,
    status?: string
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    let q = query(
      collection(db, this.ordersCollection),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    if (status) {
      q = query(q, where('status', '==', status))
    }

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const orders: GroceryOrder[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as GroceryOrder)
      })

      onUpdate(orders)
    }, (error) => {
      console.error('Error listening to orders:', error)
      onUpdate([])
    })
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!db) {
        return { success: false, error: 'Firestore not initialized' }
      }

      const orderRef = doc(db, this.ordersCollection, orderId)
      await updateDoc(orderRef, {
        status,
        updatedAt: Timestamp.now()
      })

      return { success: true }
    } catch (error) {
      console.error('Error updating order status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Client-side fuzzy search implementation
  private fuzzySearch(products: GroceryProduct[], searchTerm: string): GroceryProduct[] {
    const term = searchTerm.toLowerCase().trim()
    
    return products.filter(product => {
      const searchableText = [
        product.display_name,
        product.product_name,
        product.category,
        product.description
      ].join(' ').toLowerCase()

      // Simple fuzzy matching - check if all characters in search term appear in order
      let searchIndex = 0
      for (let i = 0; i < searchableText.length && searchIndex < term.length; i++) {
        if (searchableText[i] === term[searchIndex]) {
          searchIndex++
        }
      }

      return searchIndex === term.length
    })
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1)
    const dLng = this.deg2rad(lng2 - lng1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }
}

// Create a singleton instance
export const groceryFirestore = new GroceryFirestoreService()
