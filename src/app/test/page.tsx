"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ShoppingCart, Plus, Minus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * 🎯 SIMPLE END-TO-END GROCERY TEST PAGE
 * 
 * Flow:
 * 1. Select 2 preset coordinates (start/end)
 * 2. Add items to cart
 * 3. Send order to vendors
 * 4. Wait for vendor responses
 * 5. Select vendor
 * 6. Pay (simulated)
 */

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

interface VendorResponse {
  vendorId: string;
  vendorName: string;
  totalPrice: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  estimatedTime: number;
}

const PRESET_ROUTES = [
  {
    id: 'route1',
    name: 'Near Zeo\'s Pizza (Kondhwa)',
    start: { lat: 18.475, lng: 73.860, name: 'Kondhwa Start' },
    end: { lat: 18.485, lng: 73.870, name: 'Kondhwa End' }
  },
  {
    id: 'route2',
    name: 'NIBM Road Route',
    start: { lat: 18.5204, lng: 73.8567, name: 'NIBM Start' },
    end: { lat: 18.5300, lng: 73.8700, name: 'NIBM End' }
  },
  {
    id: 'route3',
    name: 'Mundhwa Route',
    start: { lat: 18.5550, lng: 73.9350, name: 'Mundhwa Start' },
    end: { lat: 18.5650, lng: 73.9450, name: 'Mundhwa End' }
  }
];

const COMMON_ITEMS = [
  'Milk (1L)',
  'Bread',
  'Eggs (12)',
  'Rice (1kg)',
  'Sugar (1kg)',
  'Tea',
  'Coffee',
  'Biscuits',
  'Butter',
  'Cheese'
];

export default function SimpleTestPage() {
  const { toast } = useToast();
  
  // Step states
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);
  
  // Route selection
  const [selectedRoute, setSelectedRoute] = React.useState(PRESET_ROUTES[0]);
  
  // Cart
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [customItem, setCustomItem] = React.useState('');
  
  // Order
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [sendingOrder, setSendingOrder] = React.useState(false);
  
  // Vendor responses
  const [vendorResponses, setVendorResponses] = React.useState<VendorResponse[]>([]);
  const [selectedVendor, setSelectedVendor] = React.useState<VendorResponse | null>(null);
  const [waitingForResponses, setWaitingForResponses] = React.useState(false);
  
  // Payment
  const [paying, setPaying] = React.useState(false);
  const [paymentComplete, setPaymentComplete] = React.useState(false);

  // Add item to cart
  const addToCart = (itemName: string) => {
    const existing = cart.find(item => item.name === itemName);
    if (existing) {
      setCart(cart.map(item => 
        item.name === itemName 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: `item_${Date.now()}`,
        name: itemName,
        quantity: 1
      }]);
    }
    
    toast({
      title: "Added to cart",
      description: itemName,
    });
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Send order to vendors
  const sendOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items first",
        variant: "destructive"
      });
      return;
    }

    setSendingOrder(true);
    
    try {
      // Call the actual order API
      const response = await fetch('/api/grocery/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: 'piece'
          })),
          route: {
            startLocation: {
              latitude: selectedRoute.start.lat,
              longitude: selectedRoute.start.lng
            },
            endLocation: {
              latitude: selectedRoute.end.lat,
              longitude: selectedRoute.end.lng
            }
          },
          detourPreferences: {
            maxDetourKm: 10
          }
        })
      });

      const data = await response.json();
      console.log('📦 Order response:', data);

      if (data.orderId) {
        setOrderId(data.orderId);
        setCurrentStep(3);
        
        toast({
          title: "Order Sent!",
          description: `Order ${data.orderId} sent to ${data.vendorsSent || 0} vendors`,
        });

        // Simulate waiting for responses
        setWaitingForResponses(true);
        simulateVendorResponses();
      } else {
        throw new Error(data.error || 'Failed to send order');
      }
    } catch (error) {
      console.error('❌ Error sending order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send order",
        variant: "destructive"
      });
    } finally {
      setSendingOrder(false);
    }
  };

  // Simulate vendor responses (in real app, these come from Firebase/Supabase)
  const simulateVendorResponses = () => {
    setTimeout(() => {
      const mockResponses: VendorResponse[] = [
        {
          vendorId: 'vendor1',
          vendorName: 'Zeo\'s Pizza',
          totalPrice: cart.reduce((sum, item) => sum + (item.quantity * 50), 0),
          items: cart.map(item => ({
            name: item.name,
            price: 50,
            quantity: item.quantity
          })),
          estimatedTime: 15
        },
        {
          vendorId: 'vendor2',
          vendorName: 'Quick Mart',
          totalPrice: cart.reduce((sum, item) => sum + (item.quantity * 45), 0),
          items: cart.map(item => ({
            name: item.name,
            price: 45,
            quantity: item.quantity
          })),
          estimatedTime: 20
        }
      ];

      setVendorResponses(mockResponses);
      setWaitingForResponses(false);
      setCurrentStep(4);
      
      toast({
        title: "Vendors Responded!",
        description: `${mockResponses.length} vendors sent their offers`,
      });
    }, 3000);
  };

  const selectVendor = (vendor: VendorResponse) => {
    setSelectedVendor(vendor);
    setCurrentStep(5);
    
    toast({
      title: "Vendor Selected",
      description: `You selected ${vendor.vendorName}`,
    });
  };

  const processPayment = async () => {
    setPaying(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setPaying(false);
      setPaymentComplete(true);
      
      toast({
        title: "Payment Successful!",
        description: `Paid ₹${selectedVendor?.totalPrice} to ${selectedVendor?.vendorName}`,
      });
    }, 2000);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setCart([]);
    setOrderId(null);
    setVendorResponses([]);
    setSelectedVendor(null);
    setPaymentComplete(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Simple Grocery Order Test
          </h1>
          <p className="text-gray-600">End-to-end grocery ordering flow</p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Route' },
                { num: 2, label: 'Items' },
                { num: 3, label: 'Send' },
                { num: 4, label: 'Vendors' },
                { num: 5, label: 'Pay' }
              ].map((step, idx) => (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step.num 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {currentStep > step.num ? <Check className="h-5 w-5" /> : step.num}
                    </div>
                    <span className="text-xs mt-1">{step.label}</span>
                  </div>
                  {idx < 4 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Select Route */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Step 1: Select Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PRESET_ROUTES.map(route => (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedRoute.id === route.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{route.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Start: {route.start.lat}, {route.start.lng}
                        </p>
                        <p className="text-sm text-gray-600">
                          End: {route.end.lat}, {route.end.lng}
                        </p>
                      </div>
                      {selectedRoute.id === route.id && (
                        <Check className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => setCurrentStep(2)}
                className="w-full mt-6"
              >
                Continue to Add Items
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Items */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Step 2: Add Items to Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {COMMON_ITEMS.map(item => (
                    <Button
                      key={item}
                      variant="outline"
                      onClick={() => addToCart(item)}
                      className="justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {item}
                    </Button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Custom item name..."
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customItem.trim()) {
                        addToCart(customItem);
                        setCustomItem('');
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (customItem.trim()) {
                        addToCart(customItem);
                        setCustomItem('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cart */}
            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Cart ({cart.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={sendOrder}
                      disabled={sendingOrder || cart.length === 0}
                      className="flex-1"
                    >
                      {sendingOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Order to Vendors'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Order Sent - Waiting */}
        {currentStep === 3 && waitingForResponses && (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
              <h3 className="text-xl font-medium mb-2">Order Sent!</h3>
              <p className="text-gray-600">Order ID: {orderId}</p>
              <p className="text-gray-600 mt-2">Waiting for vendors to respond...</p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Vendor Responses */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Choose Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorResponses.map(vendor => (
                  <div
                    key={vendor.vendorId}
                    className="p-4 border-2 rounded-lg hover:border-blue-300 cursor-pointer transition"
                    onClick={() => selectVendor(vendor)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{vendor.vendorName}</h3>
                        <div className="mt-2 space-y-1">
                          {vendor.items.map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-600">
                              {item.name} x{item.quantity} - ₹{item.price * item.quantity}
                            </p>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Ready in {vendor.estimatedTime} mins
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">₹{vendor.totalPrice}</Badge>
                        <Button size="sm">
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Payment */}
        {currentStep === 5 && selectedVendor && (
          <Card>
            <CardHeader>
              <CardTitle>Step 5: Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {!paymentComplete ? (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium mb-2">Order Summary</h3>
                    <p className="text-sm text-gray-600">Vendor: {selectedVendor.vendorName}</p>
                    <p className="text-sm text-gray-600">Items: {selectedVendor.items.length}</p>
                    <p className="text-sm text-gray-600">Ready in: {selectedVendor.estimatedTime} mins</p>
                    <p className="text-lg font-bold mt-2">Total: ₹{selectedVendor.totalPrice}</p>
                  </div>
                  
                  <Button
                    onClick={processPayment}
                    disabled={paying}
                    className="w-full"
                    size="lg"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      `Pay ₹${selectedVendor.totalPrice}`
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
                  <p className="text-gray-600 mb-6">
                    Your order from {selectedVendor.vendorName} will be ready in {selectedVendor.estimatedTime} minutes
                  </p>
                  <Button onClick={resetFlow}>
                    Start New Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}














