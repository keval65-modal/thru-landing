"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, MapPin, Clock, CheckCircle, XCircle, Radio } from 'lucide-react';
import { useOrderListener } from '@/hooks/useOrderListener';

interface GroceryOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function GroceryOrderFlowTest() {
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use the new real-time listener hook
  const { order, vendorResponses, loading: orderLoading } = useOrderListener(orderId);

  // Test order data
  const testOrderData = {
    userId: 'test_user_123',
    items: [
      { id: '1', name: 'Fresh Tomatoes', quantity: 2, unit: 'kg' },
      { id: '2', name: 'Whole Milk', quantity: 1, unit: 'liter' },
      { id: '3', name: 'White Bread', quantity: 2, unit: 'piece' }
    ] as GroceryOrderItem[],
    route: {
      startLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        address: 'NIBM Road, Pune'
      },
      endLocation: {
        latitude: 18.5300,
        longitude: 73.8700,
        address: 'Koregaon Park, Pune'
      },
      departureTime: new Date().toISOString()
    },
    detourPreferences: {
      maxDetourKm: 5,
      maxDetourMinutes: 15
    }
  };

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
    setError(null);

    try {
      const response = await fetch('/api/grocery/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testOrderData)
      });

      const result = await response.json();

      if (result.success) {
        setOrderId(result.orderId);
        setOrderCreated(true);
        console.log('✅ Order created successfully:', result);
        console.log('📡 Real-time listener will automatically track vendor responses');
        
        if (result.vendorAppSent) {
          console.log('✅ Order sent to vendor app successfully');
        } else {
          console.warn('⚠️ Order not sent to vendor app:', result.vendorAppError);
        }
      } else {
        throw new Error(result.error || 'Failed to create order');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      console.error('Order creation error:', err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleSelectVendor = async (vendorId: string) => {
    if (!orderId) return;

    try {
      const response = await fetch('/api/orders/select-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          vendorId,
          userId: 'test_user_123'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Vendor selected successfully:', result);
        // Real-time listener will automatically update the UI
      } else {
        throw new Error(result.error || 'Failed to select vendor');
      }
    } catch (err) {
      console.error('Error selecting vendor:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ShoppingCart className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Grocery Order Flow Test</h3>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Test Order Details:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Route: NIBM Road → Koregaon Park, Pune</li>
              <li>Max Detour: 5km (15 minutes)</li>
              <li>Items: Tomatoes (2kg), Milk (1L), Bread (2 pieces)</li>
            </ul>
          </div>

          {!orderCreated ? (
            <Button 
              onClick={handleCreateOrder}
              disabled={isCreatingOrder}
              className="w-full"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Test Order
                </>
              )}
            </Button>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Order Created Successfully!</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Order ID: {orderId}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
          )}

          {orderCreated && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Vendor Responses</h4>
                {order && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                    <span className="text-xs">Live: {order.status}</span>
                  </Badge>
                )}
              </div>
              
              {vendorResponses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="font-medium">Waiting for vendor responses...</p>
                  <p className="text-sm">Real-time listener active - responses will appear instantly</p>
                  {orderLoading && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Connecting to real-time updates...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {vendorResponses.map((response, index) => (
                    <Card key={response.orderId + '-' + response.vendorId + '-' + index} className="p-4 border-green-200 bg-green-50/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <h5 className="font-medium">{response.vendorName || 'Vendor'}</h5>
                            <Badge 
                              variant={response.status === 'accepted' ? 'default' : 'secondary'}
                              className={response.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                        response.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                            >
                              {response.status}
                            </Badge>
                          </div>
                          
                          {response.totalPrice && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                              <span className="font-semibold text-green-700">₹{response.totalPrice}</span>
                            </div>
                          )}
                          
                          {response.estimatedReadyTime && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              <span>Ready in: {response.estimatedReadyTime}</span>
                            </div>
                          )}
                          
                          {response.notes && (
                            <div className="text-xs text-muted-foreground italic mt-2">
                              "{response.notes}"
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground mt-2">
                            <span className="text-green-600">● Real-time update</span>
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => handleSelectVendor(response.vendorId)}
                          disabled={response.status !== 'accepted'}
                          className={response.status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {response.status === 'accepted' ? 'Select Vendor' : 
                           response.status === 'rejected' ? 'Rejected' : 
                           response.status === 'counter_offer' ? 'Counter Offer' : 'Pending'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
