// components/VendorNotificationHandler.tsx - Vendor notification handler component

'use client'

import React, { useState, useEffect } from 'react'
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VendorResponse } from '@/lib/vendor-response-handler'
import { Timestamp } from 'firebase/firestore'

interface VendorNotificationHandlerProps {
  orderId: string
  onVendorResponse: (response: VendorResponse) => void
  onOrderAccepted: (vendorId: string) => void
  onOrderRejected: (vendorId: string, reason: string) => void
}

export default function VendorNotificationHandler({ 
  orderId, 
  onVendorResponse, 
  onOrderAccepted, 
  onOrderRejected 
}: VendorNotificationHandlerProps) {
  const [vendorResponses, setVendorResponses] = useState<VendorResponse[]>([])
  const [acceptedVendor, setAcceptedVendor] = useState<string | null>(null)
  const [rejectedVendors, setRejectedVendors] = useState<string[]>([])
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(true)

  // Simulate vendor response timeout (5 minutes)
  useEffect(() => {
    if (isWaitingForResponse) {
      const timeout = 5 * 60 * 1000 // 5 minutes in milliseconds
      const startTime = Date.now()
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, timeout - elapsed)
        
        if (remaining > 0) {
          setTimeoutCountdown(Math.floor(remaining / 1000))
        } else {
          setTimeoutCountdown(0)
          setIsWaitingForResponse(false)
          clearInterval(interval)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isWaitingForResponse])

  // Handle vendor response
  const handleVendorResponse = (response: VendorResponse) => {
    setVendorResponses(prev => [...prev, response])
    onVendorResponse(response)

    if (response.status === 'accepted') {
      setAcceptedVendor(response.vendorId)
      setIsWaitingForResponse(false)
      onOrderAccepted(response.vendorId)
    } else if (response.status === 'rejected') {
      setRejectedVendors(prev => [...prev, response.vendorId])
      onOrderRejected(response.vendorId, response.notes || 'No reason provided')
    }
  }

  // Simulate vendor responses for demo
  useEffect(() => {
    if (isWaitingForResponse) {
      // Simulate random vendor responses
      const responses = [
        {
          orderId,
          vendorId: 'shop1',
          status: 'accepted' as const,
          notes: 'Order accepted, will be ready in 20 minutes',
          estimatedReadyTime: Date.now() + 20 * 60 * 1000, // 20 minutes from now
          respondedAt: Timestamp.now()
        },
        {
          orderId,
          vendorId: 'shop2',
          status: 'rejected' as const,
          notes: 'Some items not available',
          estimatedReadyTime: undefined,
          respondedAt: Timestamp.now()
        }
      ]

      // Simulate responses coming in at different times
      responses.forEach((response, index) => {
        setTimeout(() => {
          handleVendorResponse(response)
        }, (index + 1) * 30000) // 30 seconds apart
      })
    }
  }, [isWaitingForResponse, orderId])

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get response status icon
  const getResponseIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // Get response status color
  const getResponseColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Vendor Response Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Vendor Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Response Countdown */}
          {isWaitingForResponse && timeoutCountdown !== null && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Waiting for vendor response</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatTimeRemaining(timeoutCountdown)}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Vendors have 5 minutes to respond to your order
              </p>
            </div>
          )}

          {/* Accepted Vendor */}
          {acceptedVendor && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Order Accepted!</span>
              </div>
              <p className="text-green-700 mt-1">
                Your order has been accepted by a vendor and is being prepared.
              </p>
            </div>
          )}

          {/* Vendor Responses */}
          {vendorResponses.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Vendor Responses ({vendorResponses.length})</h4>
              {vendorResponses.map((response, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getResponseIcon(response.status)}
                      <span className="font-medium">Shop {response.vendorId}</span>
                    </div>
                    <Badge className={getResponseColor(response.status)}>
                      {response.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Estimated Ready Time:</span> {response.estimatedReadyTime ? new Date(response.estimatedReadyTime).toLocaleTimeString() : 'Not specified'}
                    </div>
                  </div>
                  
                  {response.notes && (
                    <p className="text-sm text-gray-600 mt-2">{response.notes}</p>
                  )}
                  
                </div>
              ))}
            </div>
          )}

          {/* Rejected Vendors */}
          {rejectedVendors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Rejected by {rejectedVendors.length} vendor(s)</span>
              </div>
              <p className="text-red-700 mt-1">
                Some vendors were unable to fulfill your order due to item availability.
              </p>
            </div>
          )}

          {/* No Response Warning */}
          {!isWaitingForResponse && !acceptedVendor && vendorResponses.length === 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">No vendor response</span>
              </div>
              <p className="text-yellow-700 mt-1">
                No vendors responded to your order within the timeout period.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setIsWaitingForResponse(true)
                  setAcceptedVendor(null)
                  setRejectedVendors([])
                  setVendorResponses([])
                }}
              >
                Retry Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      {acceptedVendor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Your order has been accepted by Shop {acceptedVendor}. You can contact them for updates.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Vendor
                </Button>
                <Button variant="outline" size="sm">
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
