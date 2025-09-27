// components/GroceryAPITest.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { groceryAPI } from '@/lib/grocery-api'

export default function GroceryAPITest() {
  const [searchTerm, setSearchTerm] = useState('onion')
  const [products, setProducts] = useState<any[]>([])
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testProductSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await groceryAPI.searchProducts(searchTerm, 10)
      setProducts(results)
    } catch (err) {
      setError('Error searching products: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const testShopSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      // Using Delhi coordinates as test
      const results = await groceryAPI.findNearbyShops(28.6139, 77.2090, 2)
      setShops(results)
    } catch (err) {
      setError('Error searching shops: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grocery API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Search Test */}
          <div className="space-y-2">
            <h3 className="font-semibold">Test Product Search</h3>
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search term (e.g., onion, milk)"
                className="flex-1"
              />
              <Button onClick={testProductSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search Products'}
              </Button>
            </div>
            
            {products.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Found {products.length} products:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {products.map((product, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{product.display_name}</div>
                      <div className="text-gray-600">
                        {product.pack_value} {product.pack_unit} - ₹{product.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shop Search Test */}
          <div className="space-y-2">
            <h3 className="font-semibold">Test Shop Search</h3>
            <Button onClick={testShopSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Find Shops (Delhi)'}
            </Button>
            
            {shops.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Found {shops.length} shops:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {shops.map((shop, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{shop.shopName}</div>
                      <div className="text-gray-600">
                        {shop.distance?.toFixed(1)}km away
                        {shop.rating && ` - Rating: ${shop.rating}/5`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


