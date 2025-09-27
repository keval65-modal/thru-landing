// components/ShopComparison.tsx - Shop comparison component with side-by-side analysis

'use client'

import React, { useState, useMemo } from 'react'
import { CheckCircle, XCircle, Star, Clock, Navigation, DollarSign, Package, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShopRouteData, CartItem } from '@/types/grocery-advanced'

interface ShopComparisonProps {
  shops: ShopRouteData[]
  cartItems: CartItem[]
  onShopSelect: (shopIds: string[]) => void
  selectedShopIds: string[]
  allowMultiSelect: boolean
}

export default function ShopComparison({ 
  shops, 
  cartItems, 
  onShopSelect, 
  selectedShopIds, 
  allowMultiSelect 
}: ShopComparisonProps) {
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'rating' | 'time'>('distance')
  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'partial'>('all')

  // Filter and sort shops
  const filteredAndSortedShops = useMemo(() => {
    let filtered = shops

    // Filter by availability
    if (filterBy === 'available') {
      filtered = shops.filter(shop => shop.availability.hasAllItems)
    } else if (filterBy === 'partial') {
      filtered = shops.filter(shop => !shop.availability.hasAllItems && shop.availability.availableItems.length > 0)
    }

    // Sort shops
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.routeInfo.distanceFromRoute - b.routeInfo.distanceFromRoute
        case 'price':
          return a.pricing.totalPrice - b.pricing.totalPrice
        case 'rating':
          return (b.metadata.rating || 0) - (a.metadata.rating || 0)
        case 'time':
          return a.routeInfo.estimatedTime - b.routeInfo.estimatedTime
        default:
          return 0
      }
    })
  }, [shops, sortBy, filterBy])

  // Handle shop selection
  const handleShopSelect = (shopId: string) => {
    if (allowMultiSelect) {
      const newSelected = selectedShopIds.includes(shopId)
        ? selectedShopIds.filter(id => id !== shopId)
        : [...selectedShopIds, shopId]
      onShopSelect(newSelected)
    } else {
      onShopSelect([shopId])
    }
  }

  // Get availability status
  const getAvailabilityStatus = (shop: ShopRouteData) => {
    if (shop.availability.hasAllItems) {
      return { status: 'available', label: 'All Items', color: 'bg-green-100 text-green-800' }
    } else if (shop.availability.availableItems.length > 0) {
      return { status: 'partial', label: 'Partial', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'unavailable', label: 'Limited', color: 'bg-red-100 text-red-800' }
    }
  }

  // Calculate item availability matrix
  const getItemAvailabilityMatrix = () => {
    const matrix: Array<{
      productId: string
      productName: string
      shops: Array<{
        shopId: string
        available: boolean
        price: number
        quantity: number
      }>
    }> = []

    cartItems.forEach(cartItem => {
      const shops = filteredAndSortedShops.map(shop => {
        const availableItem = shop.availability.availableItems.find(
          item => item.productId === cartItem.product.id
        )
        
        return {
          shopId: shop.id,
          available: !!availableItem,
          price: availableItem?.price || cartItem.product.price,
          quantity: availableItem?.quantity || 0
        }
      })

      matrix.push({
        productId: cartItem.product.id,
        productName: cartItem.product.display_name,
        shops
      })
    })

    return matrix
  }

  const itemMatrix = getItemAvailabilityMatrix()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compare Shops</h1>
            <p className="text-gray-600">Compare shops based on availability, pricing, and distance</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="distance">Sort by Distance</option>
              <option value="price">Sort by Price</option>
              <option value="rating">Sort by Rating</option>
              <option value="time">Sort by Time</option>
            </select>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Shops</option>
              <option value="available">All Items Available</option>
              <option value="partial">Partial Availability</option>
            </select>
          </div>
        </div>

        {/* Shop Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedShops.map(shop => {
            const isSelected = selectedShopIds.includes(shop.id)
            const availability = getAvailabilityStatus(shop)
            
            return (
              <Card 
                key={shop.id} 
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => handleShopSelect(shop.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{shop.shopName}</CardTitle>
                      <p className="text-sm text-gray-500 truncate mt-1">{shop.location.address}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <Badge className={`w-fit ${availability.color}`}>
                    {availability.label}
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-gray-400" />
                      <span>{shop.routeInfo.distanceFromRoute.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{shop.routeInfo.estimatedTime} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>₹{shop.pricing.totalPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>{shop.availability.availableItems.length}/{cartItems.length}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  {shop.metadata.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{shop.metadata.rating}</span>
                      <span className="text-sm text-gray-500">/ 5</span>
                    </div>
                  )}

                  {/* Contact Info */}
                  {shop.metadata.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{shop.metadata.phone}</span>
                    </div>
                  )}

                  {/* Preparation Time */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prep Time:</span>
                      <span className="font-medium">{shop.availability.estimatedPreparationTime} min</span>
                    </div>
                  </div>

                  {/* Missing Items */}
                  {shop.availability.missingItems.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Missing Items:</p>
                      <p className="text-xs text-red-600">
                        {shop.availability.missingItems.length} items not available
                      </p>
                    </div>
                  )}

                  {/* Select Button */}
                  <Button 
                    className={`w-full ${
                      isSelected ? 'bg-green-600 hover:bg-green-700' : ''
                    }`}
                    variant={isSelected ? 'default' : 'outline'}
                  >
                    {isSelected ? 'Selected' : 'Select Shop'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Item Availability Matrix */}
        {cartItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Item Availability Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Item</TableHead>
                      {filteredAndSortedShops.map(shop => (
                        <TableHead key={shop.id} className="text-center min-w-24">
                          <div className="truncate" title={shop.shopName}>
                            {shop.shopName}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemMatrix.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          <div className="truncate" title={item.productName}>
                            {item.productName}
                          </div>
                        </TableCell>
                        {item.shops.map(shop => (
                          <TableCell key={shop.shopId} className="text-center">
                            {shop.available ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-green-600">₹{shop.price}</span>
                                <span className="text-xs text-gray-500">Qty: {shop.quantity}</span>
                              </div>
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {selectedShopIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Selected Shops:</span>
                  <span>{selectedShopIds.length}</span>
                </div>
                
                <div className="space-y-2">
                  {selectedShopIds.map(shopId => {
                    const shop = shops.find(s => s.id === shopId)
                    if (!shop) return null
                    
                    return (
                      <div key={shopId} className="flex items-center justify-between text-sm">
                        <span>{shop.shopName}</span>
                        <div className="flex items-center gap-4">
                          <span>{shop.routeInfo.distanceFromRoute.toFixed(1)} km</span>
                          <span>₹{shop.pricing.totalPrice.toFixed(0)}</span>
                          <span>{shop.availability.estimatedPreparationTime} min</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={() => onShopSelect(selectedShopIds)}
                >
                  Proceed with Selected Shops
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Item available</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Item not available</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>Shop rating</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
