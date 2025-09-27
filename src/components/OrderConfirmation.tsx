// components/OrderConfirmation.tsx
'use client'

import { CheckCircle, MapPin, Clock, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GroceryShop } from '@/lib/grocery-api'

interface OrderConfirmationProps {
  orderId: string | null
  selectedShop: GroceryShop | null
  onNewOrder: () => void
}

export default function OrderConfirmation({ orderId, selectedShop, onNewOrder }: OrderConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-green-800">Order Placed Successfully!</CardTitle>
          <p className="text-green-700">
            Your grocery order has been confirmed and sent to the shop
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Order Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Order ID:</span>
              <Badge variant="secondary" className="font-mono">
                {orderId || 'N/A'}
              </Badge>
            </div>

            {selectedShop && (
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Shop Details</span>
                </div>
                <p className="font-semibold">{selectedShop.shopName}</p>
                <p className="text-sm text-gray-600">{selectedShop.address}</p>
                {selectedShop.phone && (
                  <p className="text-sm text-blue-600 mt-1">{selectedShop.phone}</p>
                )}
              </div>
            )}

            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium">What's Next?</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Shop will confirm your order</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Items will be prepared</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready for pickup</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onNewOrder}
              className="w-full"
              size="lg"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Place Another Order
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-600">
            <p>You can track your order status in the Orders section</p>
            <p className="mt-1">
              Estimated preparation time: 15-30 minutes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


