// components/DestinationSelector.tsx
'use client'

import { useState } from 'react'
import { MapPin, Navigation, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocation } from '@/hooks/useLocation'

interface DestinationSelectorProps {
  userLocation: {
    latitude: number
    longitude: number
    address: string
  }
  onDestinationSet: (destination: { latitude: number; longitude: number; address: string }) => void
}

export default function DestinationSelector({ userLocation, onDestinationSet }: DestinationSelectorProps) {
  const [destinationInput, setDestinationInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { geocodeAddress } = useLocation()

  const handleDestinationSubmit = async () => {
    if (!destinationInput.trim()) {
      setError('Please enter a destination address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await geocodeAddress(destinationInput.trim())
      if (result) {
        onDestinationSet(result)
      } else {
        setError('Could not find the destination address. Please try a different address.')
      }
    } catch (err) {
      setError('Error finding destination. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDestinationSubmit()
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Navigation className="w-6 h-6" />
            Set Your Destination
          </CardTitle>
          <p className="text-gray-600">
            Enter your destination to find grocery shops along your route
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Location */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Current Location</span>
            </div>
            <p className="text-sm text-blue-700">{userLocation.address}</p>
          </div>

          {/* Destination Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Where are you going?</span>
            </div>
            
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter destination address (e.g., Connaught Place, Delhi)"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-lg py-3"
              />
              
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <Button
              onClick={handleDestinationSubmit}
              disabled={loading || !destinationInput.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finding Destination...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Find Shops Along Route
                </>
              )}
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Connaught Place, Delhi',
                'Karol Bagh, Delhi',
                'Lajpat Nagar, Delhi',
                'Rajouri Garden, Delhi'
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setDestinationInput(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


