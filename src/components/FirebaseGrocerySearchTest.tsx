"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Store, Package, MapPin } from 'lucide-react';
import { useFirebaseGrocerySearch } from '@/hooks/useFirebaseGrocerySearch';

export default function FirebaseGrocerySearchTest() {
  const [searchQuery, setSearchQuery] = useState('');
  const [testLocation, setTestLocation] = useState({
    latitude: 18.5204, // NIBM Road Pune coordinates
    longitude: 73.8567
  });

  const {
    searchResults,
    isLoading,
    error,
    searchGroceryItems,
    clearResults
  } = useFirebaseGrocerySearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    await searchGroceryItems(searchQuery, testLocation, 10);
  };

  const handleClear = () => {
    setSearchQuery('');
    clearResults();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Firebase Grocery Search Test</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for grocery items (e.g., tomato, milk, bread)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>📍 Test Location: NIBM Road Pune (18.5204, 73.8567)</p>
            <p>🔍 Search Radius: 10km</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
        )}

        {searchResults && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Search Results</h4>
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {searchResults.totalFound} items found
                </Badge>
                <Badge variant="outline">
                  {searchResults.vendorsSearched} vendors searched
                </Badge>
              </div>
            </div>

            {searchResults.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items found matching "{searchQuery}"</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.items.map((item) => (
                  <Card key={`${item.vendorId}-${item.id}`} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h5 className="font-medium">{item.display_name}</h5>
                          {item.isAvailable ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Out of Stock</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Store className="h-3 w-3" />
                            <span>{item.vendorName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Package className="h-3 w-3" />
                            <span>{item.pack_value} {item.pack_unit}</span>
                          </div>
                          
                          {item.vendorLocation && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {item.vendorLocation.latitude.toFixed(4)}, {item.vendorLocation.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          ₹{item.price}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          per {item.pack_unit}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
