// components/RouteBasedDiscoveryTest.tsx - Test component for route-based shop discovery

'use client'

import React, { useState } from 'react'
import { enhancedOrderService } from '@/lib/enhanced-order-service'
import { StoreType } from '@/types/grocery-advanced'
import { RoutePoint, RouteBasedShop } from '@/lib/route-based-shop-discovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function RouteBasedDiscoveryTest() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RouteBasedShop[]>([])
  const [testData, setTestData] = useState({
    startLat: '18.5204',
    startLng: '73.8567',
    startAddress: 'Pune, Maharashtra, India',
    endLat: '19.0760',
    endLng: '72.8777',
    endAddress: 'Mumbai, Maharashtra, India',
    maxDetour: '5',
    storeType: 'grocery' as StoreType,
    transportMode: 'driving' as 'driving' | 'walking' | 'transit'
  })

  const storeTypes: StoreType[] = [
    'grocery', 'supermarket', 'medical', 'pharmacy',
    'restaurant', 'cafe', 'cloud_kitchen', 'bakery',
    'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub'
  ]

  const handleTest = async () => {
    setLoading(true)
    setResults([])

    try {
      const startPoint: RoutePoint = {
        latitude: parseFloat(testData.startLat),
        longitude: parseFloat(testData.startLng),
        address: testData.startAddress
      }

      const endPoint: RoutePoint = {
        latitude: parseFloat(testData.endLat),
        longitude: parseFloat(testData.endLng),
        address: testData.endAddress
      }

      console.log('🧪 Testing route-based discovery:', {
        startPoint,
        endPoint,
        maxDetour: testData.maxDetour,
        storeType: testData.storeType
      })

      const shops = await enhancedOrderService.findShopsForStoreType(
        startPoint,
        endPoint,
        testData.storeType,
        parseFloat(testData.maxDetour),
        testData.transportMode
      )

      setResults(shops)
      
      toast({
        title: "Test Completed",
        description: `Found ${shops.length} ${testData.storeType} shops along the route`,
      })
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: "Test Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStoreTypeDisplayName = (type: StoreType): string => {
    const displayNames: Record<StoreType, string> = {
      'grocery': 'Grocery Store',
      'supermarket': 'Supermarket',
      'medical': 'Medical Store',
      'pharmacy': 'Pharmacy',
      'restaurant': 'Restaurant',
      'cafe': 'Cafe',
      'cloud_kitchen': 'Cloud Kitchen',
      'bakery': 'Bakery',
      'fast_food': 'Fast Food',
      'fine_dining': 'Fine Dining',
      'food_truck': 'Food Truck',
      'coffee_shop': 'Coffee Shop',
      'bar': 'Bar',
      'pub': 'Pub'
    }
    
    return displayNames[type] || type
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Route-Based Shop Discovery Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-lat">Start Latitude</Label>
              <Input
                id="start-lat"
                value={testData.startLat}
                onChange={(e) => setTestData(prev => ({ ...prev, startLat: e.target.value }))}
                placeholder="18.5204"
              />
            </div>
            <div>
              <Label htmlFor="start-lng">Start Longitude</Label>
              <Input
                id="start-lng"
                value={testData.startLng}
                onChange={(e) => setTestData(prev => ({ ...prev, startLng: e.target.value }))}
                placeholder="73.8567"
              />
            </div>
            <div>
              <Label htmlFor="end-lat">End Latitude</Label>
              <Input
                id="end-lat"
                value={testData.endLat}
                onChange={(e) => setTestData(prev => ({ ...prev, endLat: e.target.value }))}
                placeholder="19.0760"
              />
            </div>
            <div>
              <Label htmlFor="end-lng">End Longitude</Label>
              <Input
                id="end-lng"
                value={testData.endLng}
                onChange={(e) => setTestData(prev => ({ ...prev, endLng: e.target.value }))}
                placeholder="72.8777"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="max-detour">Max Detour (km)</Label>
              <Input
                id="max-detour"
                type="number"
                value={testData.maxDetour}
                onChange={(e) => setTestData(prev => ({ ...prev, maxDetour: e.target.value }))}
                placeholder="5"
              />
            </div>
            <div>
              <Label htmlFor="store-type">Store Type</Label>
              <Select value={testData.storeType} onValueChange={(value: StoreType) => setTestData(prev => ({ ...prev, storeType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {storeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getStoreTypeDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transport-mode">Transport Mode</Label>
              <Select value={testData.transportMode} onValueChange={(value: 'driving' | 'walking' | 'transit') => setTestData(prev => ({ ...prev, transportMode: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving">Driving</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="transit">Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-address">Start Address</Label>
              <Input
                id="start-address"
                value={testData.startAddress}
                onChange={(e) => setTestData(prev => ({ ...prev, startAddress: e.target.value }))}
                placeholder="Pune, Maharashtra, India"
              />
            </div>
            <div>
              <Label htmlFor="end-address">End Address</Label>
              <Input
                id="end-address"
                value={testData.endAddress}
                onChange={(e) => setTestData(prev => ({ ...prev, endAddress: e.target.value }))}
                placeholder="Mumbai, Maharashtra, India"
              />
            </div>
          </div>

          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? 'Testing...' : 'Test Route-Based Discovery'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Test Results ({results.length} shops found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((shop) => (
                <div key={shop.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{shop.name}</h4>
                      <Badge variant="outline">{shop.type}</Badge>
                      {shop.isOnRoute && (
                        <Badge variant="default" className="text-xs">On Route</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{shop.address}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {shop.distanceFromRoute.toFixed(1)} km from route
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {shop.estimatedTime} min
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {shop.detourDistance.toFixed(1)} km detour
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Position: {(shop.routePosition * 100).toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">Along route</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shops found along the route</p>
              <p className="text-sm">Try adjusting the detour distance or store type</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

