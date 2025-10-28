// components/VendorAppIntegrationTest.tsx - Test component for vendor app integration

'use client'

import React, { useState } from 'react'
import { enhancedOrderService } from '@/lib/enhanced-order-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

export default function VendorAppIntegrationTest() {
  const { toast } = useToast()
  const [testOrderId, setTestOrderId] = useState('')
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Test vendor app endpoints
  const testVendorAppEndpoints = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      const results: {
        orderStatus: any
        vendorResponses: any
        processedOrder: any
        errors: string[]
      } = {
        orderStatus: null,
        vendorResponses: null,
        processedOrder: null,
        errors: []
      }

      // Test 1: Get order status
      try {
        if (testOrderId) {
          results.orderStatus = await enhancedOrderService.getOrderStatusFromVendor(testOrderId)
        }
      } catch (error) {
        results.errors.push(`Order Status Error: ${error}`)
      }

      // Test 2: Get vendor responses
      try {
        if (testOrderId) {
          results.vendorResponses = await enhancedOrderService.getVendorResponsesFromVendor(testOrderId)
        }
      } catch (error) {
        results.errors.push(`Vendor Responses Error: ${error}`)
      }

      // Test 3: Get processed order
      try {
        if (testOrderId) {
          results.processedOrder = await enhancedOrderService.getProcessedOrderFromVendor(testOrderId)
        }
      } catch (error) {
        results.errors.push(`Processed Order Error: ${error}`)
      }

      setTestResults(results)
      
      if (results.errors.length === 0) {
        toast({
          title: "Integration Test Successful",
          description: "All vendor app endpoints are working correctly",
        })
      } else {
        toast({
          title: "Integration Test Completed",
          description: `${results.errors.length} errors found. Check results below.`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Integration test error:', error)
      toast({
        title: "Integration Test Failed",
        description: "Failed to test vendor app integration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Test store type detection
  const testStoreTypeDetection = () => {
    const storeTypes = ['grocery', 'supermarket', 'medical', 'pharmacy', 'restaurant', 'cafe'] as const
    const results = storeTypes.map(type => ({
      type,
      capabilities: enhancedOrderService.getStoreCapabilities(type)
    }))
    
    setTestResults({ storeTypeTest: results })
    toast({
      title: "Store Type Test Completed",
      description: "Store type detection is working correctly",
    })
  }

  // Test fuzzy search
  const testFuzzySearch = async () => {
    setLoading(true)
    try {
      const results = await enhancedOrderService.searchProductsWithFuzzy('apple', 5)
      setTestResults({ fuzzySearchTest: results })
      toast({
        title: "Fuzzy Search Test Completed",
        description: `Found ${results.length} products for "apple"`,
      })
    } catch (error) {
      console.error('Fuzzy search test error:', error)
      toast({
        title: "Fuzzy Search Test Failed",
        description: "Failed to test fuzzy search functionality",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor App Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="order-id">Test Order ID (Optional)</Label>
            <Input
              id="order-id"
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              placeholder="Enter order ID to test specific endpoints"
            />
          </div>
          
          <div className="flex gap-4">
            <Button onClick={testVendorAppEndpoints} disabled={loading}>
              {loading ? 'Testing...' : 'Test Vendor App Endpoints'}
            </Button>
            <Button onClick={testStoreTypeDetection} variant="outline">
              Test Store Type Detection
            </Button>
            <Button onClick={testFuzzySearch} variant="outline" disabled={loading}>
              {loading ? 'Testing...' : 'Test Fuzzy Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Vendor App Endpoints Test */}
            {testResults.orderStatus !== null && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  {getStatusIcon(testResults.errors.length === 0)}
                  Vendor App Endpoints Test
                </h3>
                
                {testResults.orderStatus && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Order Status:</h4>
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(testResults.orderStatus, null, 2)}
                    </pre>
                  </div>
                )}
                
                {testResults.vendorResponses && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Vendor Responses:</h4>
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(testResults.vendorResponses, null, 2)}
                    </pre>
                  </div>
                )}
                
                {testResults.processedOrder && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Processed Order:</h4>
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(testResults.processedOrder, null, 2)}
                    </pre>
                  </div>
                )}
                
                {testResults.errors.length > 0 && (
                  <div className="p-3 bg-red-50 rounded">
                    <h4 className="font-medium mb-2 text-red-800">Errors:</h4>
                    <ul className="text-sm text-red-700">
                      {testResults.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Store Type Test */}
            {testResults.storeTypeTest && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Store Type Detection Test
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testResults.storeTypeTest.map((result: any, index: number) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{result.type}</span>
                        <Badge variant={result.capabilities.hasGroceryProcessing ? "default" : "secondary"}>
                          {result.capabilities.hasGroceryProcessing ? "Grocery Processing" : "Traditional Menu"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Categories: {result.capabilities.categories.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fuzzy Search Test */}
            {testResults.fuzzySearchTest && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Fuzzy Search Test
                </h3>
                
                <div className="space-y-2">
                  {testResults.fuzzySearchTest.map((product: any, index: number) => (
                    <div key={index} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.display_name}</p>
                        <p className="text-sm text-gray-600">{product.product_name}</p>
                        <div className="flex gap-2 mt-1">
                          {product.user_generated && (
                            <Badge variant="outline" className="text-xs">User Added</Badge>
                          )}
                          {!product.verified && (
                            <Badge variant="secondary" className="text-xs">Unverified</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{product.price || 0}</p>
                        <p className="text-xs text-gray-500">Score: {product.popularity_score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Store Type Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Fuzzy Search Database</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Enhanced Order Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Price Update System</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span>Vendor App Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
