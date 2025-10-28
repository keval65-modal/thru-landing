// app/grocery/test/page.tsx - Test page for enhanced grocery system

'use client'

import React from 'react'
import VendorAppIntegrationTest from '@/components/VendorAppIntegrationTest'
import RouteBasedDiscoveryTest from '@/components/RouteBasedDiscoveryTest'

export default function GroceryTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Grocery System Test</h1>
          <p className="text-gray-600">Test the integration with vendor app and enhanced order processing</p>
        </div>
        
        <div className="space-y-8">
          <VendorAppIntegrationTest />
          <RouteBasedDiscoveryTest />
        </div>
      </div>
    </div>
  )
}
