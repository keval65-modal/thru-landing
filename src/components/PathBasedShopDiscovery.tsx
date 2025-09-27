// components/PathBasedShopDiscovery.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, Clock, Star, Phone, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GroceryShop, groceryAPI } from '@/lib/grocery-api'
import { LocationData } from '@/hooks/useLocation'

interface PathBasedShopDiscoveryProps {
  userLocation: LocationData
  destination: LocationData
  onShopSelected: (shop: GroceryShop) => void
  selectedShop?: GroceryShop | null
}

export default function PathBasedShopDiscovery({
  userLocation,
  destination,
  onShopSelected,
  selectedShop
}: PathBasedShopDiscoveryProps) {
  const [shops, setShops] = useState<GroceryShop[]>([])
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    loadShops()
  }, [userLocation, destination])

  useEffect(() => {
    if (window.google && window.google.maps) {
      initializeMap()
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps)
          initializeMap()
        }
      }, 100)

      return () => clearInterval(checkGoogleMaps)
    }
  }, [shops])

  const loadShops = async () => {
    setLoading(true)
    try {
      const results = await groceryAPI.findNearbyShops(
        userLocation.latitude,
        userLocation.longitude,
        2 // 2km detour
      )
      setShops(results)
    } catch (error) {
      console.error('Error loading shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: {
        lat: userLocation.latitude,
        lng: userLocation.longitude
      },
      mapTypeId: window.google.maps.MapTypeId.ROADMAP
    })

    mapInstanceRef.current = map

    const directionsService = new window.google.maps.DirectionsService()
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      draggable: false,
      suppressMarkers: false
    })

    setDirectionsService(directionsService)
    setDirectionsRenderer(directionsRenderer)
    directionsRenderer.setMap(map)

    // Draw route
    drawRoute(directionsService, directionsRenderer)

    // Add shop markers
    addShopMarkers(map)

    setMapLoaded(true)
  }

  const drawRoute = (
    directionsService: google.maps.DirectionsService,
    directionsRenderer: google.maps.DirectionsRenderer
  ) => {
    const request: google.maps.DirectionsRequest = {
      origin: { lat: userLocation.latitude, lng: userLocation.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false
    }

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setDirections(result)
      }
    })
  }

  const addShopMarkers = (map: google.maps.Map) => {
    shops.forEach((shop) => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: shop.location.latitude,
          lng: shop.location.longitude
        },
        map: map,
        title: shop.shopName,
        icon: {
          url: selectedShop?.id === shop.id 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="#10B981" stroke="#ffffff" stroke-width="2"/>
                  <path d="M12 16l3 3 6-6" stroke="#ffffff" stroke-width="2" fill="none"/>
                </svg>
              `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="#3B82F6" stroke="#ffffff" stroke-width="2"/>
                  <path d="M16 8l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#ffffff"/>
                </svg>
              `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold">${shop.shopName}</h3>
            <p class="text-sm text-gray-600">${shop.address || 'Address not available'}</p>
            <p class="text-sm">Distance: ${shop.distance.toFixed(1)} km</p>
            ${shop.rating ? `<p class="text-sm">Rating: ${shop.rating}/5</p>` : ''}
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })
    })
  }

  const handleShopSelect = (shop: GroceryShop) => {
    onShopSelected(shop)
    
    // Update map markers
    if (mapInstanceRef.current) {
      addShopMarkers(mapInstanceRef.current)
    }
  }

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const formatRating = (rating?: number) => {
    if (!rating) return 'No rating'
    return `${rating.toFixed(1)}/5`
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Route & Nearby Shops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 rounded-lg overflow-hidden">
                <div
                  ref={mapRef}
                  className="w-full h-full"
                  style={{ minHeight: '384px' }}
                />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Route Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">From:</span>
                    <span className="text-gray-600">{userLocation.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="font-medium">To:</span>
                    <span className="text-gray-600">{destination.address}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shops List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Nearby Shops
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : shops.length > 0 ? (
                <div className="space-y-3">
                  {shops.map((shop) => (
                    <Card
                      key={shop.id}
                      className={`cursor-pointer transition-all ${
                        selectedShop?.id === shop.id
                          ? 'ring-2 ring-green-500 bg-green-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleShopSelect(shop)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{shop.shopName}</h3>
                              {selectedShop?.id === shop.id && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{formatDistance(shop.distance)} away</span>
                              </div>
                              
                              {shop.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span>{formatRating(shop.rating)}</span>
                                </div>
                              )}
                              
                              {shop.deliveryTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{shop.deliveryTime}</span>
                                </div>
                              )}
                              
                              {shop.isOpen !== undefined && (
                                <Badge
                                  variant={shop.isOpen ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {shop.isOpen ? 'Open' : 'Closed'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {shop.address && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {shop.address}
                          </p>
                        )}
                        
                        {shop.phone && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                            <Phone className="w-3 h-3" />
                            <span>{shop.phone}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">🏪</div>
                  <p className="text-sm text-gray-600">No shops found nearby</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your route or location
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedShop && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Selected Shop</span>
                </div>
                <h3 className="font-semibold text-green-800">{selectedShop.shopName}</h3>
                <p className="text-sm text-green-700 mt-1">
                  {formatDistance(selectedShop.distance)} away
                </p>
                <Button
                  onClick={() => onShopSelected(selectedShop)}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700"
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

