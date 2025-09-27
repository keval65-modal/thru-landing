// components/GrocerySearch.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Minus, ShoppingCart, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GroceryProduct, groceryAPI } from '@/lib/grocery-api'
import { useGroceryCart } from '@/hooks/useGroceryCart'
import { LocationData } from '@/hooks/useLocation'

interface GrocerySearchProps {
  userLocation: LocationData
  onOrderPlaced: (orderId: string) => void
}

export default function GrocerySearch({ userLocation, onOrderPlaced }: GrocerySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<GroceryProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const { addToCart, getItemCount } = useGroceryCart()

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts(searchTerm)
      } else {
        setProducts([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const searchProducts = async (term: string) => {
    setLoading(true)
    try {
      const results = await groceryAPI.searchProducts(term, 50)
      setProducts(results)
    } catch (error) {
      console.error('Error searching products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories from products
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    products.forEach(product => {
      if (product.category) {
        categorySet.add(product.category)
      }
    })
    return Array.from(categorySet).sort()
  }, [products])

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return products
    }
    return products.filter(product => product.category === selectedCategory)
  }, [products, selectedCategory])

  const handleAddToCart = (product: GroceryProduct) => {
    addToCart(product)
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search for groceries (e.g., onion, milk, bread)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category:</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('all')
                    setShowFilters(false)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        {searchTerm && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              {loading ? 'Searching...' : `Found ${filteredProducts.length} products`}
            </p>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <Badge variant="secondary">{getItemCount()} items</Badge>
            </div>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-32 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.display_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-4xl mb-2">🛒</div>
                      <div className="text-xs">No Image</div>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {product.display_name}
                  </h3>
                  
                  <div className="text-xs text-gray-500">
                    {product.pack_value} {product.pack_unit}
                  </div>

                  {product.category && (
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-green-600">
                      ₹{product.price.toFixed(2)}
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchTerm ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No products found</h3>
          <p className="text-gray-500">
            Try searching for different terms like "milk", "bread", "vegetables"
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Start Shopping</h3>
          <p className="text-gray-500">
            Search for groceries to add them to your cart
          </p>
        </div>
      )}
    </div>
  )
}

