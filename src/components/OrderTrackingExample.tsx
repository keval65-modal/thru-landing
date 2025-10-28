"use client"

import React from 'react'
import { useOrderListener } from '@/hooks/useOrderListener'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

/**
 * Example component showing how to use the new real-time order listening system
 * 
 * This replaces HTTP polling and webhook systems with Firestore real-time listeners
 */
export default function OrderTrackingExample({ orderId }: { orderId: string }) {
  const { order, vendorResponses, loading, error } = useOrderListener(orderId)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading order details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p className="font-semibold">Error loading order</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
        Order not found
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      vendor_accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      vendor_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
      counter_offer_received: { label: 'Counter Offer', color: 'bg-blue-100 text-blue-800', icon: Clock },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Order Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order #{orderId.slice(0, 8)}...</span>
            {getStatusBadge(order.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{order.createdAt.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{order.updatedAt.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items:</span>
              <span>{order.items?.length || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Responses */}
      {vendorResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Responses ({vendorResponses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendorResponses.map((response, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{response.vendorName}</span>
                  {getStatusBadge(response.status)}
                </div>
                
                {response.totalPrice && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-medium">₹{response.totalPrice}</span>
                  </div>
                )}
                
                {response.estimatedReadyTime && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Ready in: </span>
                    <span className="font-medium">{response.estimatedReadyTime}</span>
                  </div>
                )}
                
                {response.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    "{response.notes}"
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Real-time indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span>Real-time updates active</span>
      </div>
    </div>
  )
}

