// lib/inventory-check-service.ts - Inventory checking and validation service

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore'
import { db } from './firebase'
import { CartItem } from '@/types/grocery-advanced'

export interface InventoryCheckResult {
  shopId: string
  hasAllItems: boolean
  availableItems: CartItem[]
  missingItems: string[]
  totalPrice: number
  estimatedPreparationTime: number
}

export interface StockLevel {
  quantity: number
  lastUpdated: Timestamp
  isAvailable: boolean
}

export interface OperatingHours {
  isOpen: boolean
  nextOpenTime?: Timestamp
  currentHours: string
}

export interface OrderValidationResult {
  isValid: boolean
  missingItems: string[]
  priceChanges: Array<{
    productId: string
    oldPrice: number
    newPrice: number
  }>
}

export class InventoryCheckService {
  private inventoryCollection = 'shop-inventory'
  private shopsCollection = 'vendors'

  // Check item availability across shops
  async checkItemAvailability(
    items: CartItem[],
    shopIds: string[]
  ): Promise<InventoryCheckResult[]> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const results: InventoryCheckResult[] = []

      for (const shopId of shopIds) {
        const result = await this.checkShopAvailability(shopId, items)
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error checking item availability:', error)
      throw error
    }
  }

  // Check availability for a single shop
  private async checkShopAvailability(shopId: string, items: CartItem[]): Promise<InventoryCheckResult> {
    try {
      const q = query(
        collection(db, this.inventoryCollection),
        where('shopId', '==', shopId)
      )

      const querySnapshot = await getDocs(q)
      const inventory: any[] = []
      
      querySnapshot.forEach((doc) => {
        inventory.push({ id: doc.id, ...doc.data() })
      })

      const availableItems: CartItem[] = []
      const missingItems: string[] = []
      let totalPrice = 0
      let estimatedPreparationTime = 15 // Base preparation time

      items.forEach(cartItem => {
        const inventoryItem = inventory.find(inv => inv.productId === cartItem.product.id)
        
        if (inventoryItem && inventoryItem.quantity >= cartItem.quantity && inventoryItem.isAvailable) {
          // Item is available
          const availableItem: CartItem = {
            ...cartItem,
            product: {
              ...cartItem.product,
              price: inventoryItem.price // Use current price from inventory
            },
            totalPrice: cartItem.quantity * inventoryItem.price
          }
          
          availableItems.push(availableItem)
          totalPrice += availableItem.totalPrice
          estimatedPreparationTime += 2 // Add 2 minutes per item
        } else {
          // Item is not available or insufficient quantity
          missingItems.push(cartItem.product.id)
        }
      })

      return {
        shopId,
        hasAllItems: missingItems.length === 0,
        availableItems,
        missingItems,
        totalPrice,
        estimatedPreparationTime
      }
    } catch (error) {
      console.error('Error checking shop availability:', error)
      return {
        shopId,
        hasAllItems: false,
        availableItems: [],
        missingItems: items.map(item => item.product.id),
        totalPrice: 0,
        estimatedPreparationTime: 30
      }
    }
  }

  // Get real-time stock levels
  async getStockLevels(
    productId: string,
    shopId: string
  ): Promise<StockLevel> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const q = query(
        collection(db, this.inventoryCollection),
        where('shopId', '==', shopId),
        where('productId', '==', productId)
      )

      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return {
          quantity: 0,
          lastUpdated: Timestamp.now(),
          isAvailable: false
        }
      }

      const doc = querySnapshot.docs[0]
      const data = doc.data()

      return {
        quantity: data.quantity || 0,
        lastUpdated: data.lastUpdated || Timestamp.now(),
        isAvailable: data.isAvailable !== false && data.quantity > 0
      }
    } catch (error) {
      console.error('Error getting stock levels:', error)
      return {
        quantity: 0,
        lastUpdated: Timestamp.now(),
        isAvailable: false
      }
    }
  }

  // Check shop operating hours
  async checkShopOperatingHours(shopId: string): Promise<OperatingHours> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const shopDoc = await getDocs(query(
        collection(db, this.shopsCollection),
        where('__name__', '==', shopId)
      ))

      if (shopDoc.empty) {
        return {
          isOpen: false,
          currentHours: 'Shop not found'
        }
      }

      const shopData = shopDoc.docs[0].data()
      const businessHours = shopData.businessHours || {}
      const currentTime = new Date()
      const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() // 'mon', 'tue', etc.
      
      const todayHours = businessHours[currentDay]
      
      if (!todayHours) {
        return {
          isOpen: false,
          currentHours: 'Closed today'
        }
      }

      const now = currentTime.getHours() * 60 + currentTime.getMinutes()
      const openTime = this.parseTime(todayHours.open)
      const closeTime = this.parseTime(todayHours.close)
      
      const isOpen = now >= openTime && now <= closeTime
      
      return {
        isOpen,
        currentHours: `${todayHours.open} - ${todayHours.close}`,
        nextOpenTime: isOpen ? undefined : this.getNextOpenTime(businessHours, currentTime)
      }
    } catch (error) {
      console.error('Error checking shop operating hours:', error)
      return {
        isOpen: false,
        currentHours: 'Unable to check hours'
      }
    }
  }

  // Validate order against current inventory
  async validateOrder(
    orderId: string,
    shopId: string
  ): Promise<OrderValidationResult> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Get order details
      const orderQuery = await getDocs(query(
        collection(db, 'grocery-orders'),
        where('__name__', '==', orderId)
      ))

      if (orderQuery.empty) {
        return {
          isValid: false,
          missingItems: [],
          priceChanges: []
        }
      }

      const orderData = orderQuery.docs[0].data()
      const orderItems = orderData.items || []

      // Check current inventory
      const inventoryResult = await this.checkShopAvailability(shopId, orderItems)
      
      const priceChanges: Array<{
        productId: string
        oldPrice: number
        newPrice: number
      }> = []

      // Compare prices
      orderItems.forEach((orderItem: CartItem) => {
        const availableItem = inventoryResult.availableItems.find(
          item => item.product.id === orderItem.product.id
        )
        
        if (availableItem && availableItem.product.price !== orderItem.product.price) {
          priceChanges.push({
            productId: orderItem.product.id,
            oldPrice: orderItem.product.price,
            newPrice: availableItem.product.price
          })
        }
      })

      return {
        isValid: inventoryResult.hasAllItems,
        missingItems: inventoryResult.missingItems,
        priceChanges
      }
    } catch (error) {
      console.error('Error validating order:', error)
      return {
        isValid: false,
        missingItems: [],
        priceChanges: []
      }
    }
  }

  // Subscribe to inventory updates for real-time monitoring
  subscribeToInventoryUpdates(
    shopIds: string[],
    callback: (updates: Array<{
      shopId: string
      productId: string
      quantity: number
      isAvailable: boolean
      lastUpdated: Timestamp
    }>) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const q = query(
      collection(db, this.inventoryCollection),
      where('shopId', 'in', shopIds)
    )

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const updates: Array<{
        shopId: string
        productId: string
        quantity: number
        isAvailable: boolean
        lastUpdated: Timestamp
      }> = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        updates.push({
          shopId: data.shopId,
          productId: data.productId,
          quantity: data.quantity || 0,
          isAvailable: data.isAvailable !== false,
          lastUpdated: data.lastUpdated || Timestamp.now()
        })
      })

      callback(updates)
    }, (error) => {
      console.error('Error listening to inventory updates:', error)
      callback([])
    })
  }

  // Private helper methods

  private parseTime(timeString: string): number {
    const [time, period] = timeString.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let totalMinutes = hours * 60 + minutes
    
    if (period === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60
    } else if (period === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60
    }
    
    return totalMinutes
  }

  private getNextOpenTime(businessHours: any, currentTime: Date): Timestamp | undefined {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const currentDayIndex = currentTime.getDay()
    
    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (currentDayIndex + i) % 7
      const nextDay = days[nextDayIndex]
      const nextDayHours = businessHours[nextDay]
      
      if (nextDayHours) {
        const nextOpenTime = new Date(currentTime)
        nextOpenTime.setDate(nextOpenTime.getDate() + i)
        
        const [hours, minutes] = nextDayHours.open.split(':').map(Number)
        nextOpenTime.setHours(hours, minutes, 0, 0)
        
        return Timestamp.fromDate(nextOpenTime)
      }
    }
    
    return undefined
  }
}

// Create a singleton instance
export const inventoryCheckService = new InventoryCheckService()
