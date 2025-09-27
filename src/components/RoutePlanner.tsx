// components/RoutePlanner.tsx - Route planning component with Google Maps integration

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Navigation, Clock, Route, Car, User, Bus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserRouteData, LocationUpdate } from '@/types/grocery-advanced'

interface RoutePlannerProps {
  onRouteSet: (route: UserRouteData) => void
  userLocation: { latitude: number; longitude: number; address: string } | null
  onLocationUpdate: (location: LocationUpdate) => void
}

export default function RoutePlanner({ 
  onRouteSet, 
  userLocation, 
  onLocationUpdate 
}: RoutePlannerProps) {
  const [startAddress, setStartAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [detourTolerance, setDetourTolerance] = useState([2]) // in km
  const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'transit'>('driving')
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const directionsService = useRef<google.maps.DirectionsService | null>(null)
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const startAutocomplete = useRef<google.maps.places.Autocomplete | null>(null)
  const destAutocomplete = useRef<google.maps.places.Autocomplete | null>(null)

  // Initialize Google Maps
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      initializeMap()
    }
  }, [])

  // Set current location as start address
  useEffect(() => {
    if (userLocation) {
      setStartAddress(userLocation.address)
    }
  }, [userLocation])

  // Initialize map and services
  const initializeMap = useCallback(() => {
    if (!mapRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: userLocation ? 
        { lat: userLocation.latitude, lng: userLocation.longitude } : 
        { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    mapInstance.current = map
    directionsService.current = new google.maps.DirectionsService()
    directionsRenderer.current = new google.maps.DirectionsRenderer({
      draggable: true,
      map: map
    })

    // Initialize autocomplete
    initializeAutocomplete()
  }, [userLocation])

  // Initialize autocomplete for address inputs
  const initializeAutocomplete = useCallback(() => {
    if (!window.google) return

    const startInput = document.getElementById('start-address') as HTMLInputElement
    const destInput = document.getElementById('destination-address') as HTMLInputElement

    if (startInput) {
      startAutocomplete.current = new google.maps.places.Autocomplete(startInput, {
        types: ['address'],
        componentRestrictions: { country: 'in' }
      })

      startAutocomplete.current.addListener('place_changed', () => {
        const place = startAutocomplete.current?.getPlace()
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          onLocationUpdate({
            latitude: lat,
            longitude: lng,
            timestamp: Date.now()
          })
        }
      })
    }

    if (destInput) {
      destAutocomplete.current = new google.maps.places.Autocomplete(destInput, {
        types: ['address'],
        componentRestrictions: { country: 'in' }
      })
    }
  }, [onLocationUpdate])

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!startAddress || !destinationAddress || !directionsService.current || !directionsRenderer.current) {
      setError('Please enter both start and destination addresses')
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const request: google.maps.DirectionsRequest = {
        origin: startAddress,
        destination: destinationAddress,
        travelMode: transportMode === 'driving' ? google.maps.TravelMode.DRIVING :
                   transportMode === 'walking' ? google.maps.TravelMode.WALKING :
                   google.maps.TravelMode.TRANSIT,
        provideRouteAlternatives: false,
        avoidHighways: false,
        avoidTolls: false
      }

      const result = await directionsService.current.route(request)
      
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0]
        const leg = route.legs[0]
        
        // Render route on map
        directionsRenderer.current.setDirections(result)
        
        // Get route polyline
        const polyline = route.overview_path.map(point => ({
          lat: point.lat(),
          lng: point.lng()
        }))
        
        // Encode polyline (simplified - in real app, use proper polyline encoding)
        const encodedPolyline = JSON.stringify(polyline)
        
        // Create route data
        const routeData: UserRouteData = {
          start: {
            latitude: leg.start_location.lat(),
            longitude: leg.start_location.lng(),
            address: startAddress,
            timestamp: Date.now()
          },
          destination: {
            latitude: leg.end_location.lat(),
            longitude: leg.end_location.lng(),
            address: destinationAddress,
            estimatedArrival: Date.now() + ((leg.duration?.value || 0) * 1000)
          },
          detourTolerance: detourTolerance[0],
          routePolyline: encodedPolyline,
          totalDistance: (leg.distance?.value || 0) / 1000, // Convert to km
          estimatedDuration: (leg.duration?.value || 0) / 60, // Convert to minutes
          transportMode,
          currentLocation: userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            timestamp: Date.now()
          } : undefined
        }

        onRouteSet(routeData)
      } else {
        setError('No route found between the selected addresses')
      }
    } catch (err) {
      console.error('Error calculating route:', err)
      setError('Failed to calculate route. Please check your addresses.')
    } finally {
      setIsCalculating(false)
    }
  }, [startAddress, destinationAddress, detourTolerance, transportMode, userLocation, onRouteSet])

  // Use current location
  const useCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setStartAddress(results[0].formatted_address)
              onLocationUpdate({
                latitude: lat,
                longitude: lng,
                timestamp: Date.now()
              })
            }
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
          setError('Failed to get current location')
        }
      )
    } else {
      setError('Geolocation is not supported by this browser')
    }
  }, [onLocationUpdate])

  // Swap start and destination
  const swapAddresses = useCallback(() => {
    const temp = startAddress
    setStartAddress(destinationAddress)
    setDestinationAddress(temp)
  }, [startAddress, destinationAddress])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Route</h1>
          <p className="text-gray-600">Set your journey and we'll find the best grocery shops along the way</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start Address */}
              <div className="space-y-2">
                <Label htmlFor="start-address">Start Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="start-address"
                    placeholder="Enter start address"
                    value={startAddress}
                    onChange={(e) => setStartAddress(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useCurrentLocation}
                    className="px-3"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <Label htmlFor="destination-address">Destination</Label>
                <div className="flex gap-2">
                  <Input
                    id="destination-address"
                    placeholder="Enter destination address"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={swapAddresses}
                    className="px-3"
                  >
                    ⇄
                  </Button>
                </div>
              </div>

              {/* Transport Mode */}
              <div className="space-y-2">
                <Label>Transport Mode</Label>
                <Select value={transportMode} onValueChange={(value: any) => setTransportMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driving">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Driving
                      </div>
                    </SelectItem>
                    <SelectItem value="walking">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Walking
                      </div>
                    </SelectItem>
                    <SelectItem value="transit">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        Public Transit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Detour Tolerance */}
              <div className="space-y-2">
                <Label>Detour Tolerance: {detourTolerance[0]} km</Label>
                <Slider
                  value={detourTolerance}
                  onValueChange={setDetourTolerance}
                  max={5}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Maximum distance you're willing to detour from your route
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              {/* Calculate Route Button */}
              <Button
                onClick={calculateRoute}
                disabled={!startAddress || !destinationAddress || isCalculating}
                className="w-full"
                size="lg"
              >
                {isCalculating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Calculating Route...
                  </>
                ) : (
                  <>
                    <Route className="h-4 w-4 mr-2" />
                    Calculate Route
                  </>
                )}
              </Button>
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
        </div>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">How it works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <span>Set your start and destination</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <span>Choose your detour tolerance</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <span>We'll find shops along your route</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
