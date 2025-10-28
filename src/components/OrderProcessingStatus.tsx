// components/OrderProcessingStatus.tsx - Order processing status and vendor selection component

'use client'

import React, { useState, useEffect } from 'react'
import { ProcessedOrder, VendorResponse, ProcessedItem } from '@/types/grocery-advanced'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  MapPin, 
  Star, 
  CheckCircle, 
  XCircle, 
  Package, 
  ShoppingCart,
  AlertCircle,
  Truck,
  CheckCircle2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface OrderProcessingStatusProps {
  order: ProcessedOrder
  vendorResponses: VendorResponse[]
  onAcceptVendor: (vendorResponse: VendorResponse) => void
  onRejectOrder: () => void
  selectedVendor?: VendorResponse | null
}

export default function OrderProcessingStatus({
  order,
  vendorResponses,
  onAcceptVendor,
  onRejectOrder,
  selectedVendor
}: OrderProcessingStatusProps) {
  const { toast } = useToast()
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Calculate time remaining for order processing
  useEffect(() => {
    if (order.status === 'processing' && order.createdAt) {
      const orderTime = order.createdAt.toDate().getTime()
      const now = Date.now()
      const elapsed = now - orderTime
      const maxProcessingTime = 5 * 60 * 1000 // 5 minutes
      const remaining = Math.max(0, maxProcessingTime - elapsed)
      
      setTimeRemaining(remaining)
      
      const interval = setInterval(() => {
        const newElapsed = Date.now() - orderTime
        const newRemaining = Math.max(0, maxProcessingTime - newElapsed)
        setTimeRemaining(newRemaining)
        
        if (newRemaining === 0) {
          clearInterval(interval)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [order.status, order.createdAt])

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { 
        icon: Clock, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50', 
        text: 'Order sent to vendors',
        description: 'Waiting for vendor responses'
      },
      processing: { 
        icon: Package, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50', 
        text: 'Vendors are processing your order',
        description: 'Reviewing items and setting prices'
      },
      accepted: { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        text: 'Order accepted by vendor',
        description: 'Your order is being prepared'
      },
      rejected: { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50', 
        text: 'Order rejected',
        description: 'No vendors could fulfill your order'
      },
      preparing: { 
        icon: Truck, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50', 
        text: 'Order being prepared',
        description: 'Your items are being gathered'
      },
      ready: { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        text: 'Order ready for pickup',
        description: 'Your order is ready!'
      },
      completed: { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        text: 'Order completed',
        description: 'Thank you for your order!'
      },
      cancelled: { 
        icon: XCircle, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-50', 
        text: 'Order cancelled',
        description: 'This order has been cancelled'
      }
    }
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const progressMap = {
      pending: 20,
      processing: 40,
      accepted: 60,
      preparing: 80,
      ready: 100,
      completed: 100,
      rejected: 0,
      cancelled: 0
    }
    
    return progressMap[order.status as keyof typeof progressMap] || 0
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Order Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
              </div>
              <div>
                <CardTitle className="text-xl">{statusInfo.text}</CardTitle>
                <p className="text-gray-600">{statusInfo.description}</p>
              </div>
            </div>
            <Badge variant={order.status === 'rejected' || order.status === 'cancelled' ? 'destructive' : 'default'}>
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Order Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            {/* Time Remaining */}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Time remaining: {formatTimeRemaining(timeRemaining)}</span>
              </div>
            )}

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="font-medium">{order.id}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">₹{order.totalAmount}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Items</p>
                <p className="font-medium">{order.originalItems.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Responses */}
      {vendorResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Vendor Responses ({vendorResponses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendorResponses.map((response, index) => (
                <Card key={index} className={`p-4 ${selectedVendor?.shopId === response.shopId ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">Shop {response.shopId}</h3>
                        {selectedVendor?.shopId === response.shopId && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{response.estimatedPreparationTime} min</span>
                        </div>
                      </div>

                      {response.notes && (
                        <p className="text-sm text-gray-600 mb-4">{response.notes}</p>
                      )}
                    </div>

                    <div className="ml-4">
                      {selectedVendor?.shopId === response.shopId ? (
                        <Button disabled variant="outline">
                          Selected
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onAcceptVendor(response)}
                          className="w-full"
                        >
                          Accept This Vendor
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items Comparison */}
      {order.vendorResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Original vs Processed Items */}
              <div>
                <h4 className="font-medium mb-3">Items Comparison</h4>
                <div className="space-y-2">
                  {order.processedItems.map((processedItem, index) => {
                    const originalItem = order.originalItems.find(item => item.product.id === processedItem.id)
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{processedItem.display_name}</p>
                          <p className="text-sm text-gray-600">
                            {processedItem.quantity} × {processedItem.pack_value} {processedItem.pack_unit}
                          </p>
                          {processedItem.notes && (
                            <p className="text-xs text-blue-600 mt-1">{processedItem.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{processedItem.vendorPrice}</p>
                          {originalItem && originalItem.product.price !== processedItem.vendorPrice && (
                            <p className="text-xs text-gray-500 line-through">
                              ₹{originalItem.product.price}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Total Amount */}
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total Amount:</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {order.status === 'rejected' && (
        <div className="flex justify-center gap-4">
          <Button onClick={onRejectOrder} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
