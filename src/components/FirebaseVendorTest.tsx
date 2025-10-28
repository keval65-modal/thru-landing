"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Database, Store } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

interface VendorData {
  id: string;
  name: string;
  email: string;
  location?: any;
  groceryEnabled?: boolean;
  inventoryCount?: number;
}

interface TestResults {
  firebaseConnection: boolean;
  vendorsFound: number;
  groceryEnabledVendors: number;
  inventoryData: boolean;
  sampleVendors: VendorData[];
}

export default function FirebaseVendorTest() {
  const [testResults, setTestResults] = useState<TestResults>({
    firebaseConnection: false,
    vendorsFound: 0,
    groceryEnabledVendors: 0,
    inventoryData: false,
    sampleVendors: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Test 1: Check Firebase connection
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      
      setTestResults(prev => ({ ...prev, firebaseConnection: true }));

      // Test 2: Get vendors collection
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const vendors = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VendorData[];

      setTestResults(prev => ({ 
        ...prev, 
        vendorsFound: vendors.length,
        sampleVendors: vendors.slice(0, 5) // Show first 5 vendors
      }));

      // Test 3: Check grocery-enabled vendors
      const groceryEnabledVendors = vendors.filter(vendor => vendor.groceryEnabled);
      setTestResults(prev => ({ 
        ...prev, 
        groceryEnabledVendors: groceryEnabledVendors.length 
      }));

      // Test 4: Check inventory data for first grocery-enabled vendor
      if (groceryEnabledVendors.length > 0) {
        const firstVendor = groceryEnabledVendors[0];
        try {
          const inventorySnapshot = await getDocs(
            collection(db, 'vendors', firstVendor.id, 'inventory')
          );
          setTestResults(prev => ({ 
            ...prev, 
            inventoryData: inventorySnapshot.docs.length > 0 
          }));
        } catch (inventoryError) {
          console.log('No inventory data found for vendor:', firstVendor.id);
        }
      }

      // Test 5: Check grocery-skus collection
      try {
        const grocerySkusSnapshot = await getDocs(collection(db, 'grocery-skus'));
        console.log('Grocery SKUs found:', grocerySkusSnapshot.docs.length);
      } catch (skuError) {
        console.log('No grocery-skus collection found');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Firebase test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Firebase Vendor Integration Test</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Testing connectivity to shared Firebase backend and vendor data availability.
        </p>

        <Button 
          onClick={testFirebaseConnection}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing Firebase Connection...
            </>
          ) : (
            'Test Firebase Vendor Data'
          )}
        </Button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">Error: {error}</span>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Firebase Connection</span>
            {testResults.firebaseConnection ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not Tested</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Total Vendors</span>
            <Badge variant="outline">{testResults.vendorsFound}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Grocery-Enabled Vendors</span>
            <Badge variant="outline">{testResults.groceryEnabledVendors}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Inventory Data Available</span>
            {testResults.inventoryData ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Yes
              </Badge>
            ) : (
              <Badge variant="secondary">No</Badge>
            )}
          </div>
        </div>

        {testResults.sampleVendors.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Sample Vendors:</h4>
            <div className="space-y-2">
              {testResults.sampleVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Store className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{vendor.name || 'Unnamed Vendor'}</span>
                  </div>
                  <div className="flex space-x-2">
                    {vendor.groceryEnabled && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                        Grocery
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {vendor.email}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


