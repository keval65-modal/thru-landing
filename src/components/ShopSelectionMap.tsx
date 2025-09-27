// components/ShopSelectionMap.tsx - Shop selection map with multi-select functionality

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, CheckCircle, Clock, Star, Phone, Navigation, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ShopRouteData, UserRouteData, ShopMarker } from '@/types/grocery-advanced'

interface ShopSelectionMapProps {
  shops: ShopRouteData[]
  userRoute: UserRouteData
  onShopSelect: (shopIds: string[]) => void
  selectedShopIds: string[]
  allowMultiSelect: boolean
  onRouteUpdate: (route: UserRouteData) => void
}

export default function ShopSelectionMap({ 
  shops, 
  userRoute, 
  onShopSelect, 
  selectedShopIds, 
  allowMultiSelect,
  onRouteUpdate 
}: ShopSelectionMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [selectedShop, setSelectedShop] = useState<ShopRouteData | null>(null)
  const [showRoute, setShowRoute] = useState(true)
  const [showDetourArea, setShowDetourArea] = useState(true)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const directionsService = useRef<google.maps.DirectionsService | null>(null)
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const detourCircle = useRef<google.maps.Circle | null>(null)

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && mapRef.current) {
      initializeMap()
    }
  }, [])

  // Update map when shops change
  useEffect(() => {
    if (map && shops.length > 0) {
      updateMapMarkers()
    }
  }, [map, shops, selectedShopIds])

  // Update route when userRoute changes
  useEffect(() => {
    if (map && userRoute) {
      updateRoute()
    }
  }, [map, userRoute])

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current) return

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: {
        lat: userRoute.start.latitude,
        lng: userRoute.start.longitude
      },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    setMap(mapInstance)
    directionsService.current = new google.maps.DirectionsService()
    directionsRenderer.current = new google.maps.DirectionsRenderer({
      draggable: true,
      map: mapInstance
    })

    // Add route change listener
    directionsRenderer.current.addListener('directions_changed', () => {
      const directions = directionsRenderer.current?.getDirections()
      if (directions) {
        const route = directions.routes[0]
        const leg = route.legs[0]
        
        const updatedRoute: UserRouteData = {
          ...userRoute,
          start: {
            ...userRoute.start,
            latitude: leg.start_location.lat(),
            longitude: leg.start_location.lng()
          },
          destination: {
            ...userRoute.destination,
            latitude: leg.end_location.lat(),
            longitude: leg.end_location.lng()
          },
          totalDistance: (leg.distance?.value || 0) / 1000,
          estimatedDuration: (leg.duration?.value || 0) / 60
        }
        
        onRouteUpdate(updatedRoute)
      }
    })
  }, [userRoute, onRouteUpdate])

  // Update map markers
  const updateMapMarkers = useCallback(() => {
    if (!map) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))

    const newMarkers: google.maps.Marker[] = []

    shops.forEach(shop => {
      const isSelected = selectedShopIds.includes(shop.id)
      const availability = shop.availability.hasAllItems ? 'available' : 
                         shop.availability.availableItems.length > 0 ? 'partial' : 'unavailable'

      const marker = new google.maps.Marker({
        position: {
          lat: shop.location.latitude,
          lng: shop.location.longitude
        },
        map: map,
        title: shop.shopName,
        icon: {
          url: getMarkerIcon(availability, isSelected),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        },
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined
      })

      // Add click listener
      marker.addListener('click', () => {
        setSelectedShop(shop)
        handleShopClick(shop.id)
      })

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(shop, isSelected)
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)
  }, [map, shops, selectedShopIds])

  // Update route on map
  const updateRoute = useCallback(async () => {
    if (!map || !directionsService.current || !directionsRenderer.current) return

    try {
      const request: google.maps.DirectionsRequest = {
        origin: {
          lat: userRoute.start.latitude,
          lng: userRoute.start.longitude
        },
        destination: {
          lat: userRoute.destination.latitude,
          lng: userRoute.destination.longitude
        },
        travelMode: userRoute.transportMode === 'driving' ? google.maps.TravelMode.DRIVING :
                   userRoute.transportMode === 'walking' ? google.maps.TravelMode.WALKING :
                   google.maps.TravelMode.TRANSIT
      }

      const result = await directionsService.current.route(request)
      directionsRenderer.current.setDirections(result)

      // Update detour area
      updateDetourArea()
    } catch (error) {
      console.error('Error updating route:', error)
    }
  }, [map, userRoute])

  // Update detour area circle
  const updateDetourArea = useCallback(() => {
    if (!map) return

    // Remove existing circle
    if (detourCircle.current) {
      detourCircle.current.setMap(null)
    }

    if (showDetourArea) {
      const center = {
        lat: (userRoute.start.latitude + userRoute.destination.latitude) / 2,
        lng: (userRoute.start.longitude + userRoute.destination.longitude) / 2
      }

      detourCircle.current = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.1,
        map: map,
        center: center,
        radius: userRoute.detourTolerance * 1000 // Convert km to meters
      })
    }
  }, [map, userRoute, showDetourArea])

  // Handle shop click
  const handleShopClick = useCallback((shopId: string) => {
    if (allowMultiSelect) {
      const newSelected = selectedShopIds.includes(shopId)
        ? selectedShopIds.filter(id => id !== shopId)
        : [...selectedShopIds, shopId]
      onShopSelect(newSelected)
    } else {
      onShopSelect([shopId])
    }
  }, [selectedShopIds, allowMultiSelect, onShopSelect])

  // Get marker icon based on availability and selection
  const getMarkerIcon = (availability: string, isSelected: boolean): string => {
    const baseColor = isSelected ? '#10B981' : 
                     availability === 'available' ? '#3B82F6' :
                     availability === 'partial' ? '#F59E0B' : '#EF4444'
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${baseColor}" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${isSelected ? '✓' : '🏪'}</text>
      </svg>
    `)}`
  }

  // Create info window content
  const createInfoWindowContent = (shop: ShopRouteData, isSelected: boolean): string => {
    return `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-semibold text-sm mb-1">${shop.shopName}</h3>
        <p class="text-xs text-gray-600 mb-2">${shop.location.address}</p>
        <div class="space-y-1 text-xs">
          <div class="flex justify-between">
            <span>Distance:</span>
            <span>${shop.routeInfo.distanceFromRoute.toFixed(1)} km</span>
          </div>
          <div class="flex justify-between">
            <span>Time:</span>
            <span>${shop.routeInfo.estimatedTime} min</span>
          </div>
          <div class="flex justify-between">
            <span>Items:</span>
            <span class="${shop.availability.hasAllItems ? 'text-green-600' : 'text-orange-600'}">
              ${shop.availability.availableItems.length}/${shop.availability.availableItems.length + shop.availability.missingItems.length}
            </span>
          </div>
          ${shop.metadata.rating ? `
            <div class="flex justify-between">
              <span>Rating:</span>
              <span>${shop.metadata.rating}/5 ⭐</span>
            </div>
          ` : ''}
        </div>
        <button 
          class="mt-2 w-full px-3 py-1 text-xs rounded ${isSelected ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}"
          onclick="window.selectShop('${shop.id}')"
        >
          ${isSelected ? 'Selected' : 'Select Shop'}
        </button>
      </div>
    `
  }

  // Select shop from info window
  useEffect(() => {
    (window as any).selectShop = (shopId: string) => {
      handleShopClick(shopId)
    }
  }, [handleShopClick])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Select Shops</h1>
            <p className="text-gray-600">Choose shops along your route for grocery pickup</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-route"
                checked={showRoute}
                onCheckedChange={setShowRoute}
              />
              <Label htmlFor="show-route">Show Route</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-detour"
                checked={showDetourArea}
                onCheckedChange={setShowDetourArea}
              />
              <Label htmlFor="show-detour">Show Detour Area</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shop Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={mapRef} 
                  className="w-full h-96 rounded-lg border"
                  style={{ minHeight: '500px' }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Shop List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Available Shops ({shops.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {shops.map(shop => {
                  const isSelected = selectedShopIds.includes(shop.id)
                  const availability = shop.availability.hasAllItems ? 'available' : 
                                   shop.availability.availableItems.length > 0 ? 'partial' : 'unavailable'
                  
                  return (
                    <div
                      key={shop.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleShopClick(shop.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{shop.shopName}</h3>
                          <p className="text-xs text-gray-500 truncate">{shop.location.address}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant={availability === 'available' ? 'default' : 
                                     availability === 'partial' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {availability === 'available' ? 'All Items' :
                               availability === 'partial' ? 'Partial' : 'Limited'}
                            </Badge>
                            
                            {shop.metadata.rating && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {shop.metadata.rating}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {shop.routeInfo.distanceFromRoute.toFixed(1)} km
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {shop.routeInfo.estimatedTime} min
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Selected Shops Summary */}
            {selectedShopIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Selected Shops ({selectedShopIds.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedShopIds.map(shopId => {
                      const shop = shops.find(s => s.id === shopId)
                      if (!shop) return null
                      
                      return (
                        <div key={shopId} className="flex items-center justify-between text-sm">
                          <span className="truncate">{shop.shopName}</span>
                          <span className="text-gray-500">{shop.routeInfo.distanceFromRoute.toFixed(1)} km</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <Button 
                    className="w-full mt-4"
                    onClick={() => onShopSelect(selectedShopIds)}
                  >
                    Proceed with Selected Shops
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>All items available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Partial availability</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Limited availability</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Selected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
