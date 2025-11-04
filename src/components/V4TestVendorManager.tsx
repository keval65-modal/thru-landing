'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface V4TestVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  categories: string[];
  groceryEnabled: boolean;
  storeCategory: string;
  rating: number;
  totalOrders: number;
  responseTime: number;
  isActive: boolean;
}

interface V4TestVendorResponse {
  success: boolean;
  message: string;
  count: number;
  vendors: V4TestVendor[];
  timestamp: string;
  version: string;
}

export default function V4TestVendorManager() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<V4TestVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch V4 test vendors
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all' 
        ? '/api/test-vendors-v4' 
        : `/api/test-vendors-v4?category=${selectedCategory}`;
      
      const response = await fetch(url);
      const data: V4TestVendorResponse = await response.json();
      
      if (data.success) {
        setVendors(data.vendors);
        toast({
          title: "V4 Test Vendors Loaded",
          description: `Found ${data.count} vendors (${data.version})`,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching V4 test vendors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch V4 test vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create V4 test vendors
  const createVendors = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/test-vendors-v4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "V4 Test Vendors Created",
          description: data.message,
        });
        fetchVendors(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to create vendors');
      }
    } catch (error) {
      console.error('Error creating V4 test vendors:', error);
      toast({
        title: "Error",
        description: "Failed to create V4 test vendors",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Delete V4 test vendor
  const deleteVendor = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/test-vendors-v4?vendorId=${vendorId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Vendor Deleted",
          description: `Deleted vendor ${vendorId}`,
        });
        fetchVendors(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">V4 Test Vendor Manager</h1>
        <p className="text-muted-foreground">
          Clean, comprehensive test vendor management for V4 deployment
        </p>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          V4 DEPLOYMENT ACTIVE
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Controls</CardTitle>
          <CardDescription>Manage V4 test vendors</CardDescription>
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

            <Button onClick={createVendors} disabled={creating} className="bg-green-600 hover:bg-green-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create V4 Vendors
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
                  <CardTitle className="text-lg">{vendor.name}</CardTitle>
                  <CardDescription className="text-sm">{vendor.email}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {vendor.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating:</span>
                  <span className="font-medium">{vendor.rating}/5</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Orders:</span>
                  <span className="font-medium">{vendor.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response:</span>
                  <span className="font-medium">{vendor.responseTime}min</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {vendor.categories.map((category) => (
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

              <div className="text-xs text-muted-foreground">
                {vendor.location.address}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteVendor(vendor.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? 'No vendors match your search criteria.' : 'No V4 test vendors found.'}
            </p>
            <Button onClick={createVendors} className="mt-4" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create V4 Test Vendors
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





