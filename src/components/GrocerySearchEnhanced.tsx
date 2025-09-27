// components/GrocerySearchEnhanced.tsx - Enhanced grocery search with real-time updates

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Filter, Grid, List, Loader2, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GroceryProduct } from '@/lib/grocery-firestore'
import { useGroceryCartFirestore } from '@/hooks/useGroceryCartFirestore'
import { groceryFirestore } from '@/lib/grocery-firestore'

interface GrocerySearchEnhancedProps {
  onOrderPlaced?: (orderId: string) => void
}

export default function GrocerySearchEnhanced({ onOrderPlaced }: GrocerySearchEnhancedProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<GroceryProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name')
  
  const { addToCart, getItemCount, updateQuantity, removeFromCart } = useGroceryCartFirestore()

  // Real-time product subscription
  useEffect(() => {
    setLoading(true)
    
    const unsubscribe = groceryFirestore.subscribeToProducts(
      searchTerm,
      50, // Limit to 50 products
      (newProducts) => {
        setProducts(newProducts)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [searchTerm])

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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Sort products
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name)
        case 'price':
          return a.price - b.price
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    return filtered
  }, [products, selectedCategory, sortBy])

  const handleAddToCart = useCallback((product: GroceryProduct) => {
    addToCart(product)
  }, [addToCart])

  const handleQuantityChange = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      updateQuantity(productId, quantity)
    }
  }, [updateQuantity, removeFromCart])

  const ProductCard = ({ product }: { product: GroceryProduct }) => {
    const currentQuantity = getItemCount(product.id)

    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-xs text-center">
                    {product.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{product.display_name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {product.pack_value} {product.pack_unit}
              </p>
              {product.category && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {product.category}
                </Badge>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-green-600">
                  ₹{product.price.toFixed(2)}
                </span>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  {currentQuantity > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => handleQuantityChange(product.id, currentQuantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium min-w-[20px] text-center">
                        {currentQuantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => handleQuantityChange(product.id, currentQuantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      className="h-6 px-2 text-xs"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search groceries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Category" />
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

          {/* Sort Filter */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-500 ml-auto">
            {filteredProducts.length} products
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* Products Grid/List */}
      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No products found matching your search.' : 'No products available.'}
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2'
        }>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
