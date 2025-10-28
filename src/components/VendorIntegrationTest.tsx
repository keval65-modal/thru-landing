"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

interface TestOrder {
  id: string;
  orderId: string;
  vendorIds: string[];
  overallStatus: string;
  createdAt: any;
  customerInfo: any;
  vendorPortions: any[];
}

export default function VendorIntegrationTest() {
  const [vendorEmail, setVendorEmail] = useState('zeothechef@gmail.com');
  const [testOrders, setTestOrders] = useState<TestOrder[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isCreatingTestOrder, setIsCreatingTestOrder] = useState(false);
  const [testResults, setTestResults] = useState<{
    firestoreConnection: boolean;
    queryWorking: boolean;
    realTimeUpdates: boolean;
    apiEndpoints: boolean;
  }>({
    firestoreConnection: false,
    queryWorking: false,
    realTimeUpdates: false,
    apiEndpoints: false
  });

  // Test Firestore connection
  useEffect(() => {
    if (db) {
      setTestResults(prev => ({ ...prev, firestoreConnection: true }));
    }
  }, []);

  // Test Firestore query
  const testFirestoreQuery = () => {
    if (!db) {
      console.error('Firestore not initialized');
      return;
    }

    setIsListening(true);
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('vendorIds', 'array-contains', vendorEmail));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TestOrder[];
        
        setTestOrders(orders);
        setTestResults(prev => ({ ...prev, queryWorking: true, realTimeUpdates: true }));
        console.log('✅ Firestore query working! Found orders:', orders);
      },
      (error) => {
        console.error('❌ Firestore query error:', error);
        setTestResults(prev => ({ ...prev, queryWorking: false }));
      }
    );

    // Store unsubscribe function for cleanup
    return unsubscribe;
  };

  // Create test order
  const createTestOrder = async () => {
    if (!db) {
      console.error('Firestore not initialized');
      return;
    }

    setIsCreatingTestOrder(true);
    try {
      const testOrder = {
        orderId: `TEST_${Date.now()}`,
        vendorIds: [vendorEmail],
        overallStatus: 'New',
        createdAt: Timestamp.now(),
        customerInfo: {
          name: 'Test Customer',
          phone: '+91-9876543210',
          email: 'test@example.com'
        },
        vendorPortions: [{
          vendorId: vendorEmail,
          vendorName: 'Test Vendor',
          status: 'New',
          items: [
            {
              itemId: 'test-item-1',
              name: 'Test Item',
              quantity: 2,
              pricePerItem: 100,
              totalPrice: 200
            }
          ],
          vendorSubtotal: 200
        }],
        tripStartLocation: 'Test Start Location',
        tripDestination: 'Test Destination',
        paymentStatus: 'Pending',
        grandTotal: 200
      };

      await addDoc(collection(db, 'orders'), testOrder);
      console.log('✅ Test order created successfully');
    } catch (error) {
      console.error('❌ Error creating test order:', error);
    } finally {
      setIsCreatingTestOrder(false);
    }
  };

  // Test API endpoints
  const testApiEndpoints = async () => {
    const vendorApiBaseUrl = 'https://merchant.kiptech.in/api';
    
    try {
      // Test grocery search endpoint
      const searchResponse = await fetch(`${vendorApiBaseUrl}/grocery/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: JSON.stringify({
          query: 'test',
          location: {
            latitude: 12.9716,
            longitude: 77.5946
          }
        })
      });

      if (searchResponse.ok) {
        setTestResults(prev => ({ ...prev, apiEndpoints: true }));
        console.log('✅ API endpoints working!');
      } else {
        console.log('⚠️ API endpoints returned status:', searchResponse.status);
      }
    } catch (error) {
      console.error('❌ API endpoints test failed:', error);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Vendor App Integration Test</h1>
        
        {/* Test Configuration */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="vendor-email">Vendor Email</Label>
            <Input
              id="vendor-email"
              value={vendorEmail}
              onChange={(e) => setVendorEmail(e.target.value)}
              placeholder="Enter vendor email to test"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={testFirestoreQuery} disabled={isListening}>
              {isListening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Firestore Query
            </Button>
            <Button onClick={createTestOrder} disabled={isCreatingTestOrder}>
              {isCreatingTestOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Test Order
            </Button>
            <Button onClick={testApiEndpoints} variant="outline">
              Test API Endpoints
            </Button>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResults.firestoreConnection)}
              <span>Firestore Connection</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResults.queryWorking)}
              <span>Query Working</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResults.realTimeUpdates)}
              <span>Real-time Updates</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResults.apiEndpoints)}
              <span>API Endpoints</span>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {testOrders.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Orders for {vendorEmail}</h3>
            <div className="space-y-2">
              {testOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #{order.orderId}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {order.overallStatus}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {order.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                      </p>
                    </div>
                    <Badge variant={order.overallStatus === 'New' ? 'default' : 'secondary'}>
                      {order.overallStatus}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Testing Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Enter the vendor email address you want to test</li>
            <li>Click "Test Firestore Query" to start listening for orders</li>
            <li>Click "Create Test Order" to create a test order for that vendor</li>
            <li>Check if the order appears in the list below (real-time test)</li>
            <li>Click "Test API Endpoints" to verify vendor app APIs are working</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}


