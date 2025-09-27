// hooks/useLocation.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

export interface LocationData {
  latitude: number
  longitude: number
  address: string
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await response.json()
          
          if (data.results && data.results.length > 0) {
            setLocation({
              latitude,
              longitude,
              address: data.results[0].formatted_address
            })
          } else {
            setLocation({
              latitude,
              longitude,
              address: `${latitude}, ${longitude}`
            })
          }
        } catch (err) {
          console.error('Error getting address:', err)
          setLocation({
            latitude,
            longitude,
            address: `${latitude}, ${longitude}`
          })
        }
        
        setLoading(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        let errorMessage = 'Unable to get your location. Please enable location services.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access to use this feature.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }
        
        setError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [])

  const geocodeAddress = useCallback(async (address: string): Promise<LocationData | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = result.geometry.location
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          address: result.formatted_address
        }
      }
      
      return null
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }, [])

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    geocodeAddress,
    calculateDistance
  }
}

