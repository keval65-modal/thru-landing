'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle, XCircle, Store } from 'lucide-react';

interface Vendor {
  id: string;
  name?: string;
  shopName?: string;
  email?: string;
  phone?: string;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  address?: string;
  latitude?: number;
  longitude?: number;
  categories?: string[];
  groceryEnabled?: boolean;
  storeCategory?: string;
  rating?: number;
  totalOrders?: number;
  responseTime?: number;
  isActive?: boolean;
  isActiveOnThru?: boolean;
}

interface VendorResponse {
  success: boolean;
  message: string;
  count: number;
  vendors: Vendor[];
  timestamp: string;
  source: string;
  domain: string;
}

export default function V4MerchantTestVendorManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch vendors from Firestore
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all' 
        ? '/api/test-vendors-v4-merchant' 
        : `/api/test-vendors-v4-merchant?category=${selectedCategory}`;
      
      const response = await fetch(url);
      const data: VendorResponse = await response.json();
      
      if (data.success) {
        setVendors(data.vendors);
        console.log(`✅ Found ${data.count} vendors from ${data.source} on ${data.domain}`);
      } else {
        throw new Error(data.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => {
    const name = (vendor.name || vendor.shopName || '').toLowerCase();
    const email = (vendor.email || '').toLowerCase();
    const address = (vendor.location?.address || vendor.address || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || address.includes(query);
  });

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Store className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Merchant Vendor Manager</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage vendors registered in Firestore
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            PRODUCTION
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            merchant.kiptech.in
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Controls</CardTitle>
          <CardDescription>View vendors from Firestore</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search Vendors</Label>
              <Input
                id="search"
                placeholder="Search by name, email, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="min-w-[150px]">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="grocery">Grocery</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchVendors} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{vendor.name || vendor.shopName || `Vendor ${vendor.id}`}</CardTitle>
                  {vendor.email && (
                    <CardDescription className="text-sm">{vendor.email}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(vendor.isActive || vendor.isActiveOnThru) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {vendor.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.rating !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{vendor.rating}/5</span>
                  </div>
                )}
                {vendor.totalOrders !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-medium">{vendor.totalOrders}</span>
                  </div>
                )}
                {vendor.responseTime !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response:</span>
                    <span className="font-medium">{vendor.responseTime}min</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {vendor.categories && vendor.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                  {vendor.groceryEnabled && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      Grocery Enabled
                    </Badge>
                  )}
                </div>
              </div>

              {(vendor.location?.address || vendor.address) && (
                <div className="text-xs text-muted-foreground">
                  {vendor.location?.address || vendor.address}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? 'No vendors match your search criteria.' : 'No vendors found in Firestore.'}
            </p>
            <Button onClick={fetchVendors} className="mt-4" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




















