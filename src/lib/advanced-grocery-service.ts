// lib/advanced-grocery-service.ts - Advanced grocery service with route optimization and vendor notifications

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
  DocumentData,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { 
  UserRouteData, 
  AdvancedOrderData, 
  ShopRouteData, 
  CartItem, 
  GroceryProduct,
  LocationUpdate,
  VendorResponse,
  VendorResponseStats,
  RouteOptimizationResult
} from '@/types/grocery-advanced'

export class AdvancedGroceryService {
  private productsCollection = 'grocery-skus'
  private shopsCollection = 'vendors'
  private ordersCollection = 'grocery-orders'
  private vendorResponsesCollection = 'vendor-responses'
  private inventoryCollection = 'shop-inventory'

  // Calculate optimal route and find shops
  async findShopsOnRoute(
    route: UserRouteData, 
    cartItems: CartItem[]
  ): Promise<RouteOptimizationResult> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Get all shops within detour tolerance
      const shops = await this.getShopsWithinDetour(route)
      
      // Check inventory for each shop
      const shopsWithInventory = await this.checkInventoryForShops(shops, cartItems)
      
      // Calculate route optimization
      const optimizedShops = this.optimizeShopSelection(shopsWithInventory, route, cartItems)
      
      // Generate route polyline with detours
      const routePolyline = await this.generateRouteWithDetours(route, optimizedShops)
      
      // Calculate detour area
      const detourArea = this.calculateDetourArea(route, route.detourTolerance)
      
      return {
        shops: optimizedShops,
        routePolyline,
        detourArea,
        totalDetourDistance: optimizedShops.reduce((sum, shop) => sum + shop.routeInfo.detourDistance, 0),
        estimatedTotalTime: optimizedShops.reduce((sum, shop) => sum + shop.routeInfo.estimatedTime, 0)
      }
    } catch (error) {
      console.error('Error finding shops on route:', error)
      throw error
    }
  }

  // Place order with advanced routing and vendor notifications
  async placeAdvancedOrder(orderData: Omit<AdvancedOrderData, 'createdAt'>): Promise<{
    orderId: string
    status: 'pending' | 'accepted' | 'multi_shop_selection'
    assignedShops?: ShopRouteData[]
    estimatedReadyTime?: number
    unsubscribe?: () => void
  }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Create order document
      const orderWithTimestamps: Omit<AdvancedOrderData, 'id'> = {
        ...orderData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const orderRef = await addDoc(collection(db, this.ordersCollection), orderWithTimestamps)
      const orderId = orderRef.id

      // Find shops on route
      const routeResult = await this.findShopsOnRoute(orderData.userRoute, orderData.items)
      
      if (routeResult.shops.length === 0) {
        throw new Error('No shops found on route with required items')
      }

      // Send notifications to vendors
      const vendorNotifications = await this.sendVendorNotifications(orderId, routeResult.shops, orderData)
      
      // Update order with shop information
      await updateDoc(orderRef, {
        selectedShops: routeResult.shops.map(shop => shop.id),
        status: 'pending',
        updatedAt: Timestamp.now()
      })

      // If only one shop and it has all items, auto-accept
      if (routeResult.shops.length === 1 && routeResult.shops[0].availability.hasAllItems) {
        return {
          orderId,
          status: 'accepted',
          assignedShops: routeResult.shops,
          estimatedReadyTime: Date.now() + (routeResult.shops[0].availability.estimatedPreparationTime * 60000)
        }
      }

      return {
        orderId,
        status: 'multi_shop_selection',
        assignedShops: routeResult.shops
      }
    } catch (error) {
      console.error('Error placing advanced order:', error)
      throw error
    }
  }

  // Subscribe to real-time order updates
  subscribeToAdvancedOrder(orderId: string, callback: (order: AdvancedOrderData) => void): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const orderRef = doc(db, this.ordersCollection, orderId)
    
    return onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        callback({
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as AdvancedOrderData)
      }
    }, (error) => {
      console.error('Error listening to order updates:', error)
    })
  }

  // Subscribe to vendor responses
  subscribeToVendorResponses(orderId: string, callback: (responses: VendorResponse[]) => void): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const q = query(
      collection(db, this.vendorResponsesCollection),
      where('orderId', '==', orderId),
      orderBy('respondedAt', 'desc')
    )

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const responses: VendorResponse[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        responses.push({
          ...data,
          respondedAt: data.respondedAt
        } as VendorResponse)
      })
      callback(responses)
    }, (error) => {
      console.error('Error listening to vendor responses:', error)
    })
  }

  // Update user location for real-time tracking
  async updateUserLocation(orderId: string, location: LocationUpdate): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const orderRef = doc(db, this.ordersCollection, orderId)
      await updateDoc(orderRef, {
        'userRoute.currentLocation': location,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating user location:', error)
      throw error
    }
  }

  // Get vendor response times and statistics
  async getVendorResponseStats(shopId: string): Promise<VendorResponseStats> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const q = query(
        collection(db, this.vendorResponsesCollection),
        where('shopId', '==', shopId),
        where('status', '==', 'accepted')
      )

      const querySnapshot = await getDocs(q)
      const responses: VendorResponse[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        responses.push({
          ...data,
          respondedAt: data.respondedAt
        } as VendorResponse)
      })

      const totalOrders = responses.length
      const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / totalOrders
      const acceptedOrders = responses.filter(r => r.status === 'accepted').length
      const acceptanceRate = totalOrders > 0 ? acceptedOrders / totalOrders : 0

      return {
        averageResponseTime,
        totalOrders,
        acceptanceRate
      }
    } catch (error) {
      console.error('Error getting vendor response stats:', error)
      return {
        averageResponseTime: 0,
        totalOrders: 0,
        acceptanceRate: 0
      }
    }
  }

  // Search products with fuzzy matching
  async searchProducts(searchTerm: string, limitCount: number = 20): Promise<GroceryProduct[]> {
    try {
      if (!db) {
        console.warn('Firestore not initialized')
        return []
      }

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

  // Real-time product subscription
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

  // Get nearby shops
  async getNearbyShops(lat: number, lng: number, maxDetour: number = 2): Promise<ShopRouteData[]> {
    try {
      if (!db) {
        console.warn('Firestore not initialized')
        return []
      }

      const q = query(
        collection(db, this.shopsCollection),
        where('isActiveOnThru', '==', true),
        where('categories', 'array-contains', 'grocery')
      )

      const querySnapshot = await getDocs(q)
      const shops: ShopRouteData[] = []

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
                longitude: shopLng,
                address: data.address || ''
              },
              routeInfo: {
                distanceFromRoute: distance,
                detourDistance: distance,
                estimatedTime: Math.round(distance * 2), // Rough estimate: 2 minutes per km
                routePosition: 0.5 // Default position
              },
              availability: {
                hasAllItems: false,
                missingItems: [],
                availableItems: [],
                estimatedPreparationTime: 15
              },
              pricing: {
                totalPrice: 0,
                itemCount: 0,
                averageItemPrice: 0
              },
              metadata: {
                rating: data.rating,
                isOpen: data.isOpen !== false,
                phone: data.phone,
                lastUpdated: Timestamp.now()
              }
            })
          }
        }
      })

      return shops.sort((a, b) => a.routeInfo.distanceFromRoute - b.routeInfo.distanceFromRoute)
    } catch (error) {
      console.error('Error getting nearby shops:', error)
      return []
    }
  }

  // Private helper methods

  private async getShopsWithinDetour(route: UserRouteData): Promise<ShopRouteData[]> {
    // This would integrate with Google Maps API to find shops along the route
    // For now, we'll use the existing getNearbyShops method
    const centerLat = (route.start.latitude + route.destination.latitude) / 2
    const centerLng = (route.start.longitude + route.destination.longitude) / 2
    
    return this.getNearbyShops(centerLat, centerLng, route.detourTolerance)
  }

  private async checkInventoryForShops(shops: ShopRouteData[], cartItems: CartItem[]): Promise<ShopRouteData[]> {
    const shopsWithInventory = await Promise.all(
      shops.map(async (shop) => {
        const inventory = await this.checkShopInventory(shop.id, cartItems)
        return {
          ...shop,
          availability: inventory
        }
      })
    )

    return shopsWithInventory
  }

  private async checkShopInventory(shopId: string, cartItems: CartItem[]): Promise<ShopRouteData['availability']> {
    try {
      if (!db) {
        return {
          hasAllItems: false,
          missingItems: cartItems.map(item => item.product.id),
          availableItems: [],
          estimatedPreparationTime: 30
        }
      }

      const q = query(
        collection(db, this.inventoryCollection),
        where('shopId', '==', shopId)
      )

      const querySnapshot = await getDocs(q)
      const inventory: any[] = []
      
      querySnapshot.forEach((doc) => {
        inventory.push(doc.data())
      })

      const availableItems: Array<{ productId: string; quantity: number; price: number }> = []
      const missingItems: string[] = []

      cartItems.forEach(cartItem => {
        const inventoryItem = inventory.find(inv => inv.productId === cartItem.product.id)
        if (inventoryItem && inventoryItem.quantity >= cartItem.quantity) {
          availableItems.push({
            productId: cartItem.product.id,
            quantity: cartItem.quantity,
            price: inventoryItem.price
          })
        } else {
          missingItems.push(cartItem.product.id)
        }
      })

      return {
        hasAllItems: missingItems.length === 0,
        missingItems,
        availableItems,
        estimatedPreparationTime: 15 + (availableItems.length * 2) // Base time + 2 min per item
      }
    } catch (error) {
      console.error('Error checking shop inventory:', error)
      return {
        hasAllItems: false,
        missingItems: cartItems.map(item => item.product.id),
        availableItems: [],
        estimatedPreparationTime: 30
      }
    }
  }

  private optimizeShopSelection(shops: ShopRouteData[], route: UserRouteData, cartItems: CartItem[]): ShopRouteData[] {
    // Filter shops that have all items
    const availableShops = shops.filter(shop => shop.availability.hasAllItems)
    
    // Sort by priority
    const priority = route.transportMode === 'driving' ? 'distance' : 'time'
    
    return availableShops.sort((a, b) => {
      if (priority === 'distance') {
        return a.routeInfo.detourDistance - b.routeInfo.detourDistance
      } else {
        return a.routeInfo.estimatedTime - b.routeInfo.estimatedTime
      }
    })
  }

  private async generateRouteWithDetours(route: UserRouteData, shops: ShopRouteData[]): Promise<string> {
    // This would integrate with Google Maps Directions API
    // For now, return the original route polyline
    return route.routePolyline
  }

  private calculateDetourArea(route: UserRouteData, detourTolerance: number): {
    center: { latitude: number; longitude: number }
    radius: number
  } {
    const centerLat = (route.start.latitude + route.destination.latitude) / 2
    const centerLng = (route.start.longitude + route.destination.longitude) / 2
    
    return {
      center: { latitude: centerLat, longitude: centerLng },
      radius: detourTolerance
    }
  }

  private async sendVendorNotifications(orderId: string, shops: ShopRouteData[], orderData: Omit<AdvancedOrderData, 'createdAt'>): Promise<void> {
    // This would integrate with FCM or push notification service
    // For now, we'll create vendor response documents
    const batch = writeBatch(db)
    
    shops.forEach(shop => {
      const responseRef = doc(collection(db, this.vendorResponsesCollection))
      batch.set(responseRef, {
        orderId,
        shopId: shop.id,
        status: 'pending',
        responseTime: 0,
        availableItems: shop.availability.availableItems,
        missingItems: shop.availability.missingItems,
        estimatedPreparationTime: shop.availability.estimatedPreparationTime,
        respondedAt: null
      })
    })
    
    await batch.commit()
  }

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
export const advancedGroceryService = new AdvancedGroceryService()
