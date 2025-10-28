// lib/enhanced-order-service.ts - Enhanced order processing service with store type detection and vendor integration

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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { routeBasedShopDiscovery, RoutePoint, RouteBasedShop } from './route-based-shop-discovery'
import { 
  ProcessedOrder,
  ProcessedItem,
  VendorResponse,
  StoreType,
  StoreCapabilities,
  EnhancedGroceryProduct,
  UserGeneratedItem,
  PriceUpdate,
  CartItem,
  UserRouteData
} from '@/types/grocery-advanced'

export class EnhancedOrderService {
  private productsCollection = 'grocery-skus'
  private userGeneratedItemsCollection = 'user-generated-items'
  private processedOrdersCollection = 'processed-orders'
  private vendorResponsesCollection = 'vendor-responses'
  private priceUpdatesCollection = 'price-updates'
  private vendorsCollection = 'vendors'
  
  // Vendor app API base URL
  private vendorApiBaseUrl = 'https://merchant.kiptech.in/api'

  // Store type detection
  getStoreCapabilities(storeType: StoreType): StoreCapabilities {
    const groceryTypes: StoreType[] = ['grocery', 'supermarket', 'medical', 'pharmacy']
    
    return {
      hasGroceryProcessing: groceryTypes.includes(storeType),
      storeType,
      categories: this.getStoreCategories(storeType)
    }
  }

  private getStoreCategories(storeType: StoreType): string[] {
    const categoryMap: Record<StoreType, string[]> = {
      'grocery': ['grocery', 'food', 'household'],
      'supermarket': ['grocery', 'food', 'household', 'electronics'],
      'medical': ['medical', 'pharmacy', 'health'],
      'pharmacy': ['medical', 'pharmacy', 'health'],
      'restaurant': ['food', 'restaurant'],
      'cafe': ['food', 'cafe', 'beverages'],
      'cloud_kitchen': ['food', 'restaurant'],
      'bakery': ['food', 'bakery', 'desserts'],
      'fast_food': ['food', 'fast_food'],
      'fine_dining': ['food', 'restaurant', 'fine_dining'],
      'food_truck': ['food', 'fast_food'],
      'coffee_shop': ['food', 'cafe', 'beverages'],
      'bar': ['food', 'beverages', 'bar'],
      'pub': ['food', 'beverages', 'bar']
    }
    
    return categoryMap[storeType] || ['general']
  }

  // Enhanced product search with fuzzy matching and user-generated items
  async searchProductsWithFuzzy(
    searchTerm: string, 
    limitCount: number = 20
  ): Promise<EnhancedGroceryProduct[]> {
    try {
      if (!db) {
        console.warn('Firestore not initialized')
        return []
      }

      // Search both regular products and user-generated items
      const [regularProducts, userGeneratedItems] = await Promise.all([
        this.searchRegularProducts(searchTerm, limitCount),
        this.searchUserGeneratedItems(searchTerm, limitCount)
      ])

      // Combine and rank results
      const allProducts = [...regularProducts, ...userGeneratedItems]
      return this.rankSearchResults(allProducts, searchTerm).slice(0, limitCount)
    } catch (error) {
      console.error('Error searching products with fuzzy matching:', error)
      return []
    }
  }

  private async searchRegularProducts(searchTerm: string, limitCount: number): Promise<EnhancedGroceryProduct[]> {
    const q = query(
      collection(db, this.productsCollection),
      where('is_available', '==', true),
      orderBy('display_name'),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    const products: EnhancedGroceryProduct[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      products.push({
        id: doc.id,
        ...data,
        search_terms: this.generateSearchTerms(data.display_name, data.product_name, data.category),
        popularity_score: data.popularity_score || 0,
        user_generated: false,
        verified: data.verified !== false,
        created_at: data.created_at,
        updated_at: data.updated_at
      } as EnhancedGroceryProduct)
    })

    return products
  }

  private async searchUserGeneratedItems(searchTerm: string, limitCount: number): Promise<EnhancedGroceryProduct[]> {
    const q = query(
      collection(db, this.userGeneratedItemsCollection),
      where('verified', '==', true),
      orderBy('usage_count', 'desc'),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    const products: EnhancedGroceryProduct[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      products.push({
        id: doc.id,
        product_name: data.product_name,
        display_name: data.display_name,
        pack_unit: data.pack_unit,
        pack_value: data.pack_value,
        price: 0, // Will be set by vendor
        sku_id: `user_${doc.id}`,
        source: 'user_generated',
        category: data.category,
        image_url: data.image_url,
        description: data.description,
        is_available: true,
        search_terms: this.generateSearchTerms(data.display_name, data.product_name, data.category),
        popularity_score: data.usage_count || 0,
        user_generated: true,
        verified: data.verified,
        created_at: data.created_at,
        updated_at: data.created_at
      } as EnhancedGroceryProduct)
    })

    return products
  }

  private generateSearchTerms(displayName: string, productName: string, category?: string): string[] {
    const terms = new Set<string>()
    
    // Add original terms
    terms.add(displayName.toLowerCase())
    terms.add(productName.toLowerCase())
    if (category) terms.add(category.toLowerCase())
    
    // Add variations
    const words = displayName.toLowerCase().split(/\s+/)
    words.forEach(word => {
      if (word.length > 2) {
        terms.add(word)
        // Add partial matches
        for (let i = 3; i <= word.length; i++) {
          terms.add(word.substring(0, i))
        }
      }
    })
    
    return Array.from(terms)
  }

  private rankSearchResults(products: EnhancedGroceryProduct[], searchTerm: string): EnhancedGroceryProduct[] {
    const term = searchTerm.toLowerCase()
    
    return products.sort((a, b) => {
      // Exact match gets highest priority
      const aExact = a.display_name.toLowerCase().includes(term) ? 1 : 0
      const bExact = b.display_name.toLowerCase().includes(term) ? 1 : 0
      
      if (aExact !== bExact) return bExact - aExact
      
      // Then by popularity score
      if (a.popularity_score !== b.popularity_score) {
        return b.popularity_score - a.popularity_score
      }
      
      // Then by verification status
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1
      }
      
      // Finally by name
      return a.display_name.localeCompare(b.display_name)
    })
  }

  // Add user-generated item to database
  async addUserGeneratedItem(item: Omit<UserGeneratedItem, 'id' | 'created_at' | 'usage_count'>): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const itemData = {
        ...item,
        created_at: Timestamp.now(),
        usage_count: 0
      }

      const docRef = await addDoc(collection(db, this.userGeneratedItemsCollection), itemData)
      return docRef.id
    } catch (error) {
      console.error('Error adding user-generated item:', error)
      throw error
    }
  }

  // Place processed order for grocery/supermarket/medical stores
  async placeProcessedOrder(
    orderData: Omit<ProcessedOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<{ orderId: string; status: string }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Check if store type supports grocery processing
      const capabilities = this.getStoreCapabilities(orderData.storeType)
      if (!capabilities.hasGroceryProcessing) {
        throw new Error('Store type does not support grocery processing')
      }

      // Create order document
      const orderWithTimestamps: Omit<ProcessedOrder, 'id'> = {
        ...orderData,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const orderRef = await addDoc(collection(db, this.processedOrdersCollection), orderWithTimestamps)
      const orderId = orderRef.id

      // Send order to vendor app
      await this.sendOrderToVendorApp(orderId, orderData)

      return {
        orderId,
        status: 'pending'
      }
    } catch (error) {
      console.error('Error placing processed order:', error)
      throw error
    }
  }

  // Send order to vendor app for processing
  private async sendOrderToVendorApp(orderId: string, orderData: Omit<ProcessedOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<void> {
    try {
      // Import VendorOrderService dynamically to avoid circular dependencies
      const { default: VendorOrderService } = await import('./vendor-order-service')
      const vendorOrderService = new VendorOrderService()
      
      const transformedOrderData = vendorOrderService.transformOrderForVendor({
        id: orderId,
        ...orderData
      })

      const result = await vendorOrderService.sendOrderToVendorApp(transformedOrderData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send order to vendor app')
      }

      console.log('✅ Order sent to vendor app successfully')
    } catch (error) {
      console.error('Error sending order to vendor app:', error)
      throw error
    }
  }

  // Subscribe to processed order updates
  subscribeToProcessedOrder(orderId: string, callback: (order: ProcessedOrder) => void): () => void {
    if (!db) {
      console.warn('Firestore not initialized')
      return () => {}
    }

    const orderRef = doc(db, this.processedOrdersCollection, orderId)
    
    return onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        callback({
          id: doc.id,
          ...data,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as ProcessedOrder)
      }
    }, (error) => {
      console.error('Error listening to processed order updates:', error)
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
          respondedAt: data.respondedAt?.toDate() || new Date()
        } as VendorResponse)
      })
      callback(responses)
    }, (error) => {
      console.error('Error listening to vendor responses:', error)
    })
  }

  // Accept vendor response and update order
  async acceptVendorResponse(orderId: string, vendorResponse: VendorResponse): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const orderRef = doc(db, this.processedOrdersCollection, orderId)
      
      await updateDoc(orderRef, {
        status: 'accepted',
        vendorResponse,
        processedItems: [],
        totalAmount: 0,
        estimatedReadyTime: new Date(Date.now() + vendorResponse.estimatedPreparationTime * 60000),
        updatedAt: Timestamp.now()
      })

      // Update prices in the database
      await this.updateProductPrices([], vendorResponse.shopId)
    } catch (error) {
      console.error('Error accepting vendor response:', error)
      throw error
    }
  }

  // Update product prices based on vendor bids
  private async updateProductPrices(processedItems: ProcessedItem[], vendorId: string): Promise<void> {
    try {
      if (!db) return

      const batch = writeBatch(db)
      
      for (const item of processedItems) {
        // Update price in products collection
        const productRef = doc(db, this.productsCollection, item.id)
        batch.update(productRef, {
          price: item.vendorPrice,
          updated_at: Timestamp.now()
        })

        // Record price update
        const priceUpdateRef = doc(collection(db, this.priceUpdatesCollection))
        batch.set(priceUpdateRef, {
          productId: item.id,
          vendorId,
          oldPrice: item.originalPrice,
          newPrice: item.vendorPrice,
          updatedAt: Timestamp.now(),
          reason: 'vendor_bid'
        })
      }

      await batch.commit()
    } catch (error) {
      console.error('Error updating product prices:', error)
    }
  }

  // Get order status from vendor app
  async getOrderStatusFromVendor(orderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.vendorApiBaseUrl}/grocery/orders/${orderId}`)
      
      if (!response.ok) {
        throw new Error(`Vendor API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting order status from vendor:', error)
      throw error
    }
  }

  // Get vendor responses from vendor app
  async getVendorResponsesFromVendor(orderId: string): Promise<VendorResponse[]> {
    try {
      const response = await fetch(`${this.vendorApiBaseUrl}/grocery/orders/${orderId}/vendor-responses`)
      
      if (!response.ok) {
        throw new Error(`Vendor API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting vendor responses from vendor:', error)
      throw error
    }
  }

  // Get processed order details from vendor app
  async getProcessedOrderFromVendor(orderId: string): Promise<ProcessedOrder> {
    try {
      const response = await fetch(`${this.vendorApiBaseUrl}/grocery/orders/${orderId}/processed`)
      
      if (!response.ok) {
        throw new Error(`Vendor API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting processed order from vendor:', error)
      throw error
    }
  }

  // Find shops along route with proper filtering
  async findShopsAlongRoute(
    startPoint: RoutePoint,
    endPoint: RoutePoint,
    maxDetourKm: number = 5,
    storeTypes: StoreType[] = ['grocery', 'supermarket', 'medical', 'pharmacy'],
    transportMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteBasedShop[]> {
    try {
      console.log('🔍 Finding shops along route with proper filtering:', {
        startPoint,
        endPoint,
        maxDetourKm,
        storeTypes
      })

      const result = await routeBasedShopDiscovery.findShopsAlongRoute(
        startPoint,
        endPoint,
        maxDetourKm,
        storeTypes,
        transportMode
      )

      console.log(`✅ Found ${result.shops.length} shops along route`)
      return result.shops
    } catch (error) {
      console.error('❌ Error finding shops along route:', error)
      throw error
    }
  }

  // Find shops for specific store type (grocery vs takeout)
  async findShopsForStoreType(
    startPoint: RoutePoint,
    endPoint: RoutePoint,
    storeType: StoreType,
    maxDetourKm: number = 5,
    transportMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteBasedShop[]> {
    try {
      const capabilities = this.getStoreCapabilities(storeType)
      
      // Determine which store types to search for based on the requested type
      let searchTypes: StoreType[]
      
      if (capabilities.hasGroceryProcessing) {
        // For grocery processing stores, only search for grocery-related types
        searchTypes = ['grocery', 'supermarket', 'medical', 'pharmacy']
      } else {
        // For traditional menu stores, only search for food-related types
        searchTypes = ['restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub']
      }

      console.log(`🏪 Searching for ${storeType} stores (${capabilities.hasGroceryProcessing ? 'grocery processing' : 'traditional menu'}):`, searchTypes)

      const shops = await this.findShopsAlongRoute(
        startPoint,
        endPoint,
        maxDetourKm,
        searchTypes,
        transportMode
      )

      // Filter to only include shops of the requested type
      const filteredShops = shops.filter(shop => shop.type === storeType)
      
      console.log(`✅ Found ${filteredShops.length} ${storeType} shops along route`)
      return filteredShops
    } catch (error) {
      console.error('❌ Error finding shops for store type:', error)
      throw error
    }
  }
}

// Create a singleton instance
export const enhancedOrderService = new EnhancedOrderService()
