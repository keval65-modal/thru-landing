// components/ShoppingCartEnhanced.tsx - Enhanced shopping cart with Firestore persistence

'use client'

import React, { useState, useCallback } from 'react'
import { 
  ShoppingCart as ShoppingCartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  MapPin, 
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGroceryCartFirestore } from '@/hooks/useGroceryCartFirestore'
import { groceryFirestore, GroceryShop } from '@/lib/grocery-firestore'
import { auth } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

interface ShoppingCartEnhancedProps {
  userLocation?: {
    latitude: number
    longitude: number
    address: string
  }
  onOrderPlaced?: (orderId: string) => void
}

export default function ShoppingCartEnhanced({ 
  userLocation, 
  onOrderPlaced 
}: ShoppingCartEnhancedProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOrdering, setIsOrdering] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [availableShops, setAvailableShops] = useState<GroceryShop[]>([])
  const [loadingShops, setLoadingShops] = useState(false)
  const { toast } = useToast()

  const {
    items,
    selectedShop,
    totalItems,
    totalAmount,
    isLoading,
    error,
    updateQuantity,
    removeFromCart,
    clearCart,
    setSelectedShop,
    setError,
    setLoading
  } = useGroceryCartFirestore()

  // Load nearby shops when cart is expanded
  const loadNearbyShops = useCallback(async () => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location access to find nearby shops.",
        variant: "destructive"
      })
      return
    }

    setLoadingShops(true)
    try {
      const shops = await groceryFirestore.findNearbyShops(
        userLocation.latitude,
        userLocation.longitude,
        5 // 5km radius
      )
      setAvailableShops(shops)
      
      if (shops.length === 0) {
        toast({
          title: "No Shops Found",
          description: "No grocery shops found nearby. Please try a different location.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading shops:', error)
      toast({
        title: "Error",
        description: "Failed to load nearby shops. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoadingShops(false)
    }
  }, [userLocation, toast])

  // Handle cart expansion
  const handleCartExpand = useCallback(() => {
    setIsExpanded(true)
    if (availableShops.length === 0) {
      loadNearbyShops()
    }
  }, [loadNearbyShops, availableShops.length])

  // Place order
  const handlePlaceOrder = useCallback(async () => {
    const user = auth?.currentUser
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place an order.",
        variant: "destructive"
      })
      return
    }

    if (!selectedShop) {
      toast({
        title: "Shop Selection Required",
        description: "Please select a shop before placing your order.",
        variant: "destructive"
      })
      return
    }

    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Location information is required to place an order.",
        variant: "destructive"
      })
      return
    }

    setIsOrdering(true)
    setError(null)

    try {
      const orderItems = Array.from(items.values()).map(item => ({
        id: item.product.id,
        product_name: item.product.product_name,
        display_name: item.product.display_name,
        pack_unit: item.product.pack_unit,
        pack_value: item.product.pack_value,
        price: item.product.price,
        sku_id: item.product.sku_id,
        source: item.product.source,
        quantity: item.quantity
      }))

      const orderData = {
        userId: user.uid,
        items: orderItems,
        selectedShopId: selectedShop.id,
        userLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: userLocation.address
        },
        totalAmount: totalAmount,
        notes: orderNotes.trim() || undefined,
        status: 'pending' as const
      }

      const result = await groceryFirestore.placeOrder(orderData)

      if (result.success && result.orderId) {
        toast({
          title: "Order Placed Successfully!",
          description: `Your order #${result.orderId} has been placed.`,
        })
        
        clearCart()
        setIsExpanded(false)
        onOrderPlaced?.(result.orderId)
      } else {
        throw new Error(result.error || 'Failed to place order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      setError(error instanceof Error ? error.message : 'Failed to place order')
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : 'Failed to place order',
        variant: "destructive"
      })
    } finally {
      setIsOrdering(false)
    }
  }, [
    auth,
    selectedShop,
    userLocation,
    items,
    totalAmount,
    orderNotes,
    clearCart,
    onOrderPlaced,
    toast,
    setError
  ])

  if (totalItems === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          disabled
        >
          <ShoppingCartIcon className="w-5 h-5 mr-2" />
          Cart (0)
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={handleCartExpand}
        >
          <ShoppingCartIcon className="w-5 h-5 mr-2" />
          Cart ({totalItems})
          <Badge variant="secondary" className="ml-2">
            ₹{totalAmount.toFixed(2)}
          </Badge>
        </Button>
      ) : (
        <Card className="w-96 max-h-[80vh] overflow-hidden shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Shopping Cart</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Cart Items */}
            <div className="space-y-2">
              {Array.from(items.values()).map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {item.product.display_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {item.product.pack_value} {item.product.pack_unit}
                    </p>
                    <p className="text-sm font-semibold text-green-600">
                      ₹{item.totalPrice.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Shop Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Shop</label>
              {loadingShops ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading nearby shops...
                </div>
              ) : (
                <Select 
                  value={selectedShop?.id || ''} 
                  onValueChange={(shopId) => {
                    const shop = availableShops.find(s => s.id === shopId)
                    setSelectedShop(shop || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{shop.shopName}</div>
                            <div className="text-xs text-gray-500">
                              {shop.distance?.toFixed(1)}km • {shop.deliveryTime}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Order Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Order Notes (Optional)</label>
              <Textarea
                placeholder="Special instructions for your order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {/* Order Summary */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items ({totalItems})</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={!selectedShop || isOrdering || totalItems === 0}
              className="w-full"
              size="lg"
            >
              {isOrdering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
