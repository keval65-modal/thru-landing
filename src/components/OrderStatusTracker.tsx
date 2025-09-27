// components/OrderStatusTracker.tsx - Order status tracker with real-time updates

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Clock, 
  CheckCircle, 
  Package, 
  MapPin, 
  Phone, 
  Navigation, 
  RefreshCw,
  AlertCircle,
  Truck,
  ShoppingBag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AdvancedOrderData, LocationUpdate } from '@/types/grocery-advanced'

interface OrderStatusTrackerProps {
  orderId: string
  order: AdvancedOrderData
  onLocationUpdate: (location: LocationUpdate) => void
  onNewOrder: () => void
}

export default function OrderStatusTracker({ 
  orderId, 
  order, 
  onLocationUpdate, 
  onNewOrder 
}: OrderStatusTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState(order.status)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [vendorResponseTime, setVendorResponseTime] = useState<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [lastLocationUpdate, setLastLocationUpdate] = useState<LocationUpdate | null>(null)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const locationWatchId = useRef<number | null>(null)

  // Status configuration
  const statusConfig = {
    pending: {
      label: 'Order Pending',
      description: 'Waiting for vendor response',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      progress: 10
    },
    accepted: {
      label: 'Order Accepted',
      description: 'Vendor has accepted your order',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      progress: 25
    },
    multi_shop_selection: {
      label: 'Shop Selection',
      description: 'Choose your preferred shop',
      icon: Package,
      color: 'bg-blue-100 text-blue-800',
      progress: 15
    },
    preparing: {
      label: 'Preparing Order',
      description: 'Your order is being prepared',
      icon: Package,
      color: 'bg-orange-100 text-orange-800',
      progress: 50
    },
    ready: {
      label: 'Order Ready',
      description: 'Your order is ready for pickup',
      icon: ShoppingBag,
      color: 'bg-green-100 text-green-800',
      progress: 75
    },
    completed: {
      label: 'Order Completed',
      description: 'Order has been completed',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      progress: 100
    },
    cancelled: {
      label: 'Order Cancelled',
      description: 'Order has been cancelled',
      icon: AlertCircle,
      color: 'bg-red-100 text-red-800',
      progress: 0
    }
  }

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && mapRef.current) {
      initializeMap()
    }
  }, [])

  // Start location tracking
  useEffect(() => {
    if (isTracking) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }

    return () => stopLocationTracking()
  }, [isTracking])

  // Calculate time remaining
  useEffect(() => {
    if (order.estimatedReadyTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, (order.estimatedReadyTime || 0) - now)
        setTimeRemaining(remaining)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [order.estimatedReadyTime])

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: {
        lat: order.userRoute.start.latitude,
        lng: order.userRoute.start.longitude
      },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    mapInstance.current = map

    // Add route
    addRouteToMap()
    
    // Add shop markers
    addShopMarkers()
  }

  // Add route to map
  const addRouteToMap = () => {
    if (!mapInstance.current) return

    const directionsService = new google.maps.DirectionsService()
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: mapInstance.current,
      suppressMarkers: true
    })

    const request: google.maps.DirectionsRequest = {
      origin: {
        lat: order.userRoute.start.latitude,
        lng: order.userRoute.start.longitude
      },
      destination: {
        lat: order.userRoute.destination.latitude,
        lng: order.userRoute.destination.longitude
      },
      travelMode: order.userRoute.transportMode === 'driving' ? google.maps.TravelMode.DRIVING :
                 order.userRoute.transportMode === 'walking' ? google.maps.TravelMode.WALKING :
                 google.maps.TravelMode.TRANSIT
    }

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result)
      }
    })
  }

  // Add shop markers
  const addShopMarkers = () => {
    if (!mapInstance.current) return

    // Add start marker
    new google.maps.Marker({
      position: {
        lat: order.userRoute.start.latitude,
        lng: order.userRoute.start.longitude
      },
      map: mapInstance.current,
      title: 'Start Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#10B981" stroke="white" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24)
      }
    })

    // Add destination marker
    new google.maps.Marker({
      position: {
        lat: order.userRoute.destination.latitude,
        lng: order.userRoute.destination.longitude
      },
      map: mapInstance.current,
      title: 'Destination',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="white" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">D</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24)
      }
    })

    // Add shop markers if selected
    if (order.selectedShops && order.selectedShops.length > 0) {
      // This would require shop data - for now, we'll skip
    }
  }

  // Start location tracking
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      locationWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationUpdate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now()
          }
          
          setLastLocationUpdate(location)
          onLocationUpdate(location)
          
          // Update map with current location
          if (mapInstance.current) {
            new google.maps.Marker({
              position: {
                lat: location.latitude,
                lng: location.longitude
              },
              map: mapInstance.current,
              title: 'Your Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                    <circle cx="10" cy="10" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(20, 20)
              }
            })
          }
        },
        (error) => {
          console.error('Location tracking error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      )
    }
  }

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId.current) {
      navigator.geolocation.clearWatch(locationWatchId.current)
      locationWatchId.current = null
    }
  }

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get status icon
  const StatusIcon = statusConfig[currentStatus].icon

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
            <p className="text-gray-600">Order #{orderId}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setIsTracking(!isTracking)}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={statusConfig[currentStatus].color}>
                  {statusConfig[currentStatus].label}
                </Badge>
                <span className="text-sm text-gray-500">
                  {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-600">{statusConfig[currentStatus].description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{statusConfig[currentStatus].progress}%</span>
                </div>
                <Progress value={statusConfig[currentStatus].progress} className="h-2" />
              </div>

              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Estimated Ready Time</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {formatTimeRemaining(timeRemaining)}
                  </p>
                </div>
              )}

              {vendorResponseTime && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Vendor Response Time</span>
                  </div>
                  <p className="text-lg font-bold text-green-900 mt-1">
                    {vendorResponseTime} seconds
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport Mode:</span>
                  <span className="font-medium capitalize">{order.userRoute.transportMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Route Distance:</span>
                  <span className="font-medium">{order.userRoute.totalDistance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Duration:</span>
                  <span className="font-medium">{order.userRoute.estimatedDuration.toFixed(0)} min</span>
                </div>
              </div>

              {order.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Notes:</strong> {order.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product.display_name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.product.pack_value} {item.product.pack_unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Qty: {item.quantity}</p>
                    <p className="text-sm text-gray-500">₹{item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              className="w-full h-96 rounded-lg border"
              style={{ minHeight: '400px' }}
            />
          </CardContent>
        </Card>

        {/* Location Tracking Status */}
        {isTracking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Location Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastLocationUpdate ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Last updated: {new Date(lastLocationUpdate.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Location: {lastLocationUpdate.latitude.toFixed(6)}, {lastLocationUpdate.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Waiting for location update...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onNewOrder}
            className="px-8"
          >
            Place New Order
          </Button>
        </div>
      </div>
    </div>
  )
}
