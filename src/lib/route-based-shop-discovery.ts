// lib/route-based-shop-discovery.ts - Proper route-based shop discovery with Google Maps integration

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { SupabaseVendorService } from './supabase/vendor-service'
import { StoreType, StoreCapabilities } from '@/types/grocery-advanced'

export interface RoutePoint {
  latitude: number
  longitude: number
  address: string
}

export interface ShopLocation {
  id: string
  name: string
  type: StoreType
  coordinates: {
    lat: number
    lng: number
  }
  address: string
  categories: string[]
  isActiveOnThru: boolean
  rating?: number
  phone?: string
  email?: string
  businessHours?: any
}

export interface RouteBasedShop {
  id: string
  name: string
  type: StoreType
  coordinates: {
    lat: number
    lng: number
  }
  address: string
  categories: string[]
  // Route-specific data
  distanceFromRoute: number // km from the route
  detourDistance: number // km additional distance to visit this shop
  routePosition: number // Position along route (0-1)
  estimatedTime: number // minutes to reach this shop
  isOnRoute: boolean // Whether this shop is actually on the route
}

export interface RouteCalculationResult {
  shops: RouteBasedShop[]
  routePolyline: string
  totalDistance: number // km
  totalDuration: number // minutes
  detourArea: {
    center: { lat: number; lng: number }
    radius: number // km
  }
}

export class RouteBasedShopDiscovery {
  private shopsCollection = 'vendors'
  private directionsService: google.maps.DirectionsService | null = null

  constructor() {
    if (typeof window !== 'undefined' && window.google?.maps) {
      this.directionsService = new google.maps.DirectionsService()
    }
  }

  // Main method to find shops along a route
  async findShopsAlongRoute(
    startPoint: RoutePoint,
    endPoint: RoutePoint,
    maxDetourKm: number = 5,
    storeTypes: StoreType[] = ['grocery', 'supermarket', 'medical', 'pharmacy', 'restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub'],
    transportMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteCalculationResult> {
    try {
      console.log('🔍 Finding shops along route:', { startPoint, endPoint, maxDetourKm, storeTypes })

      // Get all shops from database
      const allShops = await this.getAllShops()
      console.log(`📦 Found ${allShops.length} total shops in database`)

      // Filter shops by store types
      const filteredShops = this.filterShopsByType(allShops, storeTypes)
      console.log(`🏪 Filtered to ${filteredShops.length} shops by type`)

      // Calculate route and find shops along it
      const routeResult = await this.calculateRouteWithShops(
        startPoint,
        endPoint,
        filteredShops,
        maxDetourKm,
        transportMode
      )

      console.log(`✅ Found ${routeResult.shops.length} shops along route`)
      return routeResult
    } catch (error) {
      console.error('❌ Error finding shops along route:', error)
      // Return empty result when Google Maps API fails
      // This ensures no shops are shown when route calculation fails
      return {
        shops: [],
        routePolyline: '',
        totalDistance: 0,
        totalDuration: 0,
        detourArea: {
          center: { lat: startPoint.latitude, lng: startPoint.longitude },
          radius: maxDetourKm
        }
      }
    }
  }

  // Get all shops from database (NOW USING SUPABASE!)
  private async getAllShops(): Promise<ShopLocation[]> {
    try {
      console.log('🔍 Fetching vendors from SUPABASE...')
      
      // Get all active vendors from Supabase
      const vendors = await SupabaseVendorService.getActiveVendors()
      console.log(`📊 Found ${vendors.length} active vendors in Supabase`)

      const shops: ShopLocation[] = []

      vendors.forEach((vendor) => {
        const shopLat = vendor.location?.latitude
        const shopLng = vendor.location?.longitude

        if (shopLat && shopLng) {
          // ✅ USE store_type from Supabase directly, don't derive from categories!
          const storeType = (vendor.storeType || 'grocery') as StoreType
          
          shops.push({
            id: vendor.id,
            name: vendor.name || 'Unknown Shop',
            type: storeType, // ✅ Use the actual store_type from database
            coordinates: { lat: shopLat, lng: shopLng },
            address: vendor.address || 'Address not available',
            categories: vendor.categories || [],
            isActiveOnThru: vendor.isActiveOnThru || true,
            rating: 4.5, // Default rating
            phone: vendor.phone,
            email: vendor.email,
            businessHours: vendor.operatingHours
          })
        }
      })

      console.log(`✅ Mapped ${shops.length} vendors with valid locations`)
      return shops
    } catch (error) {
      console.error('❌ Error fetching vendors from Supabase:', error)
      // Fallback to empty array instead of Firebase
      return []
    }
  }

  // Filter shops by store types
  private filterShopsByType(shops: ShopLocation[], storeTypes: StoreType[]): ShopLocation[] {
    return shops.filter(shop => {
      // Check if shop type is in the requested types
      return storeTypes.includes(shop.type)
    })
  }

  // Determine store type from categories
  private determineStoreType(categories: string[]): StoreType {
    const categoryMap: Record<string, StoreType> = {
      'grocery': 'grocery',
      'supermarket': 'supermarket',
      'medical': 'medical',
      'pharmacy': 'pharmacy',
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'cloud_kitchen': 'cloud_kitchen',
      'bakery': 'bakery',
      'fast_food': 'fast_food',
      'fine_dining': 'fine_dining',
      'food_truck': 'food_truck',
      'coffee_shop': 'coffee_shop',
      'bar': 'bar',
      'pub': 'pub'
    }

    for (const category of categories) {
      const storeType = categoryMap[category.toLowerCase()]
      if (storeType) {
        return storeType
      }
    }

    // Default to grocery if no specific type found
    return 'grocery'
  }

  // Calculate route and find shops along it
  private async calculateRouteWithShops(
    startPoint: RoutePoint,
    endPoint: RoutePoint,
    shops: ShopLocation[],
    maxDetourKm: number,
    transportMode: 'driving' | 'walking' | 'transit'
  ): Promise<RouteCalculationResult> {
    if (!this.directionsService) {
      console.warn('⚠️ Google Maps Directions Service not available - using perpendicular distance fallback')
      
      // CORRECT FALLBACK: Calculate perpendicular distance from shop to route LINE
      const nearbyShops: RouteBasedShop[] = shops
        .map(shop => {
          // Calculate perpendicular distance from shop to the line segment between start and end
          const distanceFromLine = this.calculatePerpendicularDistance(
            shop.coordinates.lat,
            shop.coordinates.lng,
            startPoint.latitude,
            startPoint.longitude,
            endPoint.latitude,
            endPoint.longitude
          )
          
          // Calculate position along route (0 = start, 1 = end)
          const routePosition = this.calculateRoutePosition(
            shop.coordinates.lat,
            shop.coordinates.lng,
            startPoint.latitude,
            startPoint.longitude,
            endPoint.latitude,
            endPoint.longitude
          )
          
          // Distance from start
          const distanceFromStart = this.calculateDistance(
            startPoint.latitude,
            startPoint.longitude,
            shop.coordinates.lat,
            shop.coordinates.lng
          )
          
          return {
            id: shop.id,
            name: shop.name,
            type: shop.type,
            coordinates: shop.coordinates,
            address: shop.address,
            categories: shop.categories,
            distanceFromRoute: distanceFromLine,
            detourDistance: distanceFromLine,
            routePosition: routePosition,
            estimatedTime: Math.round(distanceFromStart * 3), // ~3 min per km
            isOnRoute: distanceFromLine <= 1 // Within 1km is "on route"
          }
        })
        .filter(shop => {
          // Filter: perpendicular distance within maxDetourKm AND reasonably along the route (not way past endpoints)
          const withinDetour = shop.distanceFromRoute <= maxDetourKm
          const alongRoute = shop.routePosition >= -0.2 && shop.routePosition <= 1.2 // Allow 20% margin on either side
          return withinDetour && alongRoute
        })
        .sort((a, b) => a.routePosition - b.routePosition) // Sort by position along route
      
      console.log(`✅ Fallback mode: Found ${nearbyShops.length} shops within ${maxDetourKm}km of route`)
      nearbyShops.forEach(shop => {
        console.log(`  - ${shop.name}: ${shop.distanceFromRoute.toFixed(2)}km from route, position ${(shop.routePosition * 100).toFixed(0)}%`)
      })
      
      return {
        shops: nearbyShops,
        routePolyline: '',
        totalDistance: this.calculateDistance(startPoint.latitude, startPoint.longitude, endPoint.latitude, endPoint.longitude),
        totalDuration: 0,
        detourArea: {
          center: {
            lat: (startPoint.latitude + endPoint.latitude) / 2,
            lng: (startPoint.longitude + endPoint.longitude) / 2
          },
          radius: maxDetourKm
        }
      }
    }

    // Calculate the main route
    const routeRequest: google.maps.DirectionsRequest = {
      origin: { lat: startPoint.latitude, lng: startPoint.longitude },
      destination: { lat: endPoint.latitude, lng: endPoint.longitude },
      travelMode: this.getGoogleMapsTravelMode(transportMode),
      optimizeWaypoints: false
    }

    let routeResult: google.maps.DirectionsResult;
    try {
      // Add timeout to prevent hanging forever
      routeResult = await Promise.race([
        new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          this.directionsService!.route(routeRequest, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result)
            } else {
              console.warn(`⚠️ Google Maps Directions request failed: ${status}`)
              reject(new Error(`Directions request failed: ${status}`))
            }
          })
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Google Maps request timeout after 5 seconds')), 5000)
        )
      ])
    } catch (error) {
      console.error('❌ Google Maps error, falling back to perpendicular distance calculation:', error)
      
      // FALLBACK: Calculate perpendicular distance from shop to route LINE
      const nearbyShops: RouteBasedShop[] = shops
        .map(shop => {
          const distanceFromLine = this.calculatePerpendicularDistance(
            shop.coordinates.lat,
            shop.coordinates.lng,
            startPoint.latitude,
            startPoint.longitude,
            endPoint.latitude,
            endPoint.longitude
          )
          
          const routePosition = this.calculateRoutePosition(
            shop.coordinates.lat,
            shop.coordinates.lng,
            startPoint.latitude,
            startPoint.longitude,
            endPoint.latitude,
            endPoint.longitude
          )
          
          const distanceFromStart = this.calculateDistance(
            startPoint.latitude,
            startPoint.longitude,
            shop.coordinates.lat,
            shop.coordinates.lng
          )
          
          return {
            id: shop.id,
            name: shop.name,
            type: shop.type,
            coordinates: shop.coordinates,
            address: shop.address,
            categories: shop.categories,
            distanceFromRoute: distanceFromLine,
            detourDistance: distanceFromLine,
            routePosition: routePosition,
            estimatedTime: Math.round(distanceFromStart * 3),
            isOnRoute: distanceFromLine <= 1
          }
        })
        .filter(shop => {
          const withinDetour = shop.distanceFromRoute <= maxDetourKm
          const alongRoute = shop.routePosition >= -0.2 && shop.routePosition <= 1.2
          return withinDetour && alongRoute
        })
        .sort((a, b) => a.routePosition - b.routePosition)
      
      console.log(`✅ Fallback mode (after error): Found ${nearbyShops.length} shops within ${maxDetourKm}km of route`)
      nearbyShops.forEach(shop => {
        console.log(`  - ${shop.name}: ${shop.distanceFromRoute.toFixed(2)}km from route, position ${(shop.routePosition * 100).toFixed(0)}%`)
      })
      
      return {
        shops: nearbyShops,
        routePolyline: '',
        totalDistance: this.calculateDistance(startPoint.latitude, startPoint.longitude, endPoint.latitude, endPoint.longitude),
        totalDuration: 0,
        detourArea: {
          center: {
            lat: (startPoint.latitude + endPoint.latitude) / 2,
            lng: (startPoint.longitude + endPoint.longitude) / 2
          },
          radius: maxDetourKm
        }
      }
    }

    // Extract route polyline and basic info
    const routePolyline = routeResult.routes[0].overview_polyline
    const totalDistance = routeResult.routes[0].legs[0].distance?.value || 0 // meters
    const totalDuration = routeResult.routes[0].legs[0].duration?.value || 0 // seconds

    // If route polyline is empty (Google Maps API failed), return empty result
    if (!routePolyline || routePolyline === '') {
      console.warn('⚠️ Route polyline is empty - returning empty result')
      return {
        shops: [],
        routePolyline: '',
        totalDistance: 0,
        totalDuration: 0,
        detourArea: {
          center: { lat: startPoint.latitude, lng: startPoint.longitude },
          radius: maxDetourKm
        }
      }
    }

    // Find shops along the route
    const shopsAlongRoute = await this.findShopsAlongRoutePolyline(
      routeResult,
      shops,
      maxDetourKm
    )

    // Calculate detour area
    const detourArea = this.calculateDetourArea(startPoint, endPoint, maxDetourKm)

    return {
      shops: shopsAlongRoute,
      routePolyline,
      totalDistance: totalDistance / 1000, // Convert to km
      totalDuration: totalDuration / 60, // Convert to minutes
      detourArea
    }
  }

  // Find shops along the route polyline
  private async findShopsAlongRoutePolyline(
    routeResult: google.maps.DirectionsResult,
    shops: ShopLocation[],
    maxDetourKm: number
  ): Promise<RouteBasedShop[]> {
    const route = routeResult.routes[0]
    const routePath = route.overview_path || []
    
    if (routePath.length === 0) {
      console.warn('⚠️ No route path found')
      return []
    }

    const shopsAlongRoute: RouteBasedShop[] = []

    for (const shop of shops) {
      try {
        const shopAnalysis = await this.analyzeShopAlongRoute(
          shop,
          routePath,
          maxDetourKm
        )

        if (shopAnalysis) {
          shopsAlongRoute.push(shopAnalysis)
        }
      } catch (error) {
        console.warn(`⚠️ Error analyzing shop ${shop.name}:`, error)
      }
    }

    // Sort by distance from route
    return shopsAlongRoute.sort((a, b) => a.distanceFromRoute - b.distanceFromRoute)
  }

  // Analyze if a shop is along the route
  private async analyzeShopAlongRoute(
    shop: ShopLocation,
    routePath: google.maps.LatLng[],
    maxDetourKm: number
  ): Promise<RouteBasedShop | null> {
    // Find the closest point on the route to the shop
    let minDistance = Infinity
    let closestPointIndex = -1

    for (let i = 0; i < routePath.length; i++) {
      const routePoint = routePath[i]
      const distance = this.calculateDistance(
        shop.coordinates.lat,
        shop.coordinates.lng,
        routePoint.lat(),
        routePoint.lng()
      )

      if (distance < minDistance) {
        minDistance = distance
        closestPointIndex = i
      }
    }

    // Convert distance to km
    const distanceFromRoute = minDistance / 1000

    // Check if shop is within detour tolerance
    if (distanceFromRoute > maxDetourKm) {
      return null
    }

    // Calculate detour distance (additional distance to visit this shop)
    const detourDistance = distanceFromRoute * 2 // Rough estimate: go to shop and back to route

    // Calculate route position (0-1)
    const routePosition = closestPointIndex / (routePath.length - 1)

    // Estimate time to reach shop (rough calculation)
    const estimatedTime = Math.round(distanceFromRoute * 2) // 2 minutes per km

    return {
      id: shop.id,
      name: shop.name,
      type: shop.type,
      coordinates: shop.coordinates,
      address: shop.address,
      categories: shop.categories,
      distanceFromRoute,
      detourDistance,
      routePosition,
      estimatedTime,
      isOnRoute: distanceFromRoute < 0.5 // Consider "on route" if within 500m
    }
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth's radius in meters
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

  // Calculate perpendicular distance from a point to a line segment
  private calculatePerpendicularDistance(
    pointLat: number,
    pointLng: number,
    line1Lat: number,
    line1Lng: number,
    line2Lat: number,
    line2Lng: number
  ): number {
    // Convert to meters using simple projection (good enough for short distances)
    const x = pointLng
    const y = pointLat
    const x1 = line1Lng
    const y1 = line1Lat
    const x2 = line2Lng
    const y2 = line2Lat
    
    // Calculate perpendicular distance from point to line segment
    const A = x - x1
    const B = y - y1
    const C = x2 - x1
    const D = y2 - y1
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    let param = -1
    if (lenSq !== 0) {
      param = dot / lenSq
    }
    
    let xx, yy
    
    if (param < 0) {
      // Closest point is line1
      xx = x1
      yy = y1
    } else if (param > 1) {
      // Closest point is line2
      xx = x2
      yy = y2
    } else {
      // Closest point is on the line segment
      xx = x1 + param * C
      yy = y1 + param * D
    }
    
    // Calculate distance from point to closest point on line
    const distanceInDegrees = Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy))
    
    // Convert to km (approximate: 1 degree ≈ 111km at equator)
    // For more accuracy, we use Haversine
    return this.calculateDistance(pointLat, pointLng, yy, xx) / 1000
  }

  // Calculate position along route (0 = start, 1 = end)
  private calculateRoutePosition(
    pointLat: number,
    pointLng: number,
    line1Lat: number,
    line1Lng: number,
    line2Lat: number,
    line2Lng: number
  ): number {
    const x = pointLng
    const y = pointLat
    const x1 = line1Lng
    const y1 = line1Lat
    const x2 = line2Lng
    const y2 = line2Lat
    
    // Project point onto line and return parameter t (0 = start, 1 = end)
    const A = x - x1
    const B = y - y1
    const C = x2 - x1
    const D = y2 - y1
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    if (lenSq === 0) {
      return 0 // Start and end are the same point
    }
    
    return dot / lenSq
  }

  // Calculate detour area
  private calculateDetourArea(
    startPoint: RoutePoint,
    endPoint: RoutePoint,
    maxDetourKm: number
  ): { center: { lat: number; lng: number }; radius: number } {
    const centerLat = (startPoint.latitude + endPoint.latitude) / 2
    const centerLng = (startPoint.longitude + endPoint.longitude) / 2

    return {
      center: { lat: centerLat, lng: centerLng },
      radius: maxDetourKm
    }
  }

  // Convert transport mode to Google Maps travel mode
  private getGoogleMapsTravelMode(transportMode: 'driving' | 'walking' | 'transit'): google.maps.TravelMode {
    switch (transportMode) {
      case 'driving':
        return google.maps.TravelMode.DRIVING
      case 'walking':
        return google.maps.TravelMode.WALKING
      case 'transit':
        return google.maps.TravelMode.TRANSIT
      default:
        return google.maps.TravelMode.DRIVING
    }
  }

  // Get store capabilities for filtering
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
}

// Create a singleton instance
export const routeBasedShopDiscovery = new RouteBasedShopDiscovery()
