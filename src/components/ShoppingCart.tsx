// components/ShoppingCart.tsx
'use client'

import { useState } from 'react'
import { ShoppingCart as ShoppingCartIcon, Plus, Minus, Trash2, CreditCard, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CartItem, useGroceryCart } from '@/hooks/useGroceryCart'
import { GroceryShop } from '@/lib/grocery-api'

interface ShoppingCartProps {
  items: Map<string, CartItem>
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  selectedShop: GroceryShop | null
  onPlaceOrder: () => void
  isOrdering: boolean
}

export default function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  selectedShop,
  onPlaceOrder,
  isOrdering
}: ShoppingCartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const cartItems = Array.from(items.values())
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)

  const handleQuantityChange = (productId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change
    if (newQuantity <= 0) {
      onRemoveItem(productId)
    } else {
      onUpdateQuantity(productId, newQuantity)
    }
  }

  if (cartItems.length === 0) {
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
      <div className="relative">
        {/* Cart Button */}
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ShoppingCartIcon className="w-5 h-5 mr-2" />
          Cart ({totalItems})
          <Badge variant="secondary" className="ml-2">
            ₹{totalAmount.toFixed(2)}
          </Badge>
        </Button>

        {/* Cart Dropdown */}
        {isExpanded && (
          <Card className="absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Shopping Cart</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="p-4 border-b last:border-b-0">
                    <div className="flex items-start gap-3">
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.display_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-gray-400 text-lg">🛒</span>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {item.product.display_name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.product.pack_value} {item.product.pack_unit}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-semibold text-green-600">
                            ₹{item.product.price.toFixed(2)}
                          </div>
                          <div className="text-sm font-semibold">
                            ₹{item.totalPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => onRemoveItem(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Cart Summary */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Items ({totalItems})</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Selected Shop Info */}
                {selectedShop ? (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Selected Shop</span>
                    </div>
                    <p className="text-sm text-green-700">{selectedShop.shopName}</p>
                    <p className="text-xs text-green-600">
                      {selectedShop.distance.toFixed(1)}km away
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Please select a shop to continue
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={onPlaceOrder}
                    disabled={!selectedShop || isOrdering}
                  >
                    {isOrdering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Place Order - ₹{totalAmount.toFixed(2)}
                      </>
                    )}
                  </Button>
                  
                  {cartItems.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={onClearCart}
                    >
                      Clear Cart
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

