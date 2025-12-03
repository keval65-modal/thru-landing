"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { routeBasedShopDiscovery } from "@/lib/route-based-shop-discovery";

/**
 * SIMPLE TEST PAGE FOR DEBUGGING VENDOR DISPLAY
 * This bypasses Google Places API and uses direct coordinates
 */
export default function SimpleTestPage() {
  const { toast } = useToast();
  
  const [startLat, setStartLat] = React.useState("18.475");
  const [startLng, setStartLng] = React.useState("73.860");
  const [endLat, setEndLat] = React.useState("18.485");
  const [endLng, setEndLng] = React.useState("73.870");
  const [maxDetourKm, setMaxDetourKm] = React.useState("10");
  const [loading, setLoading] = React.useState(false);
  const [shops, setShops] = React.useState<any[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    setShops([]);
    
    try {
      console.log('🔍 Searching for vendors...');
      console.log('Start:', { lat: parseFloat(startLat), lng: parseFloat(startLng) });
      console.log('End:', { lat: parseFloat(endLat), lng: parseFloat(endLng) });
      console.log('Max Detour:', maxDetourKm, 'km');
      
      const result = await routeBasedShopDiscovery.findShopsAlongRoute(
        { 
          latitude: parseFloat(startLat), 
          longitude: parseFloat(startLng), 
          address: `${startLat}, ${startLng}` 
        },
        { 
          latitude: parseFloat(endLat), 
          longitude: parseFloat(endLng), 
          address: `${endLat}, ${endLng}` 
        },
        parseFloat(maxDetourKm),
        ['restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub'] as any
      );
      
      console.log(`✅ Found ${result.shops.length} food shops`);
      console.log('Shops:', result.shops);
      
      setShops(result.shops);
      
      toast({
        title: "Search Complete",
        description: `Found ${result.shops.length} food shop${result.shops.length !== 1 ? 's' : ''} along your route.`,
      });
    } catch (error) {
      console.error('❌ Error searching:', error);
      toast({
        title: "Error",
        description: "Failed to search for shops. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Vendor Test Page</h1>
          <p className="text-gray-600">Direct coordinate entry for debugging</p>
        </div>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Latitude</label>
                  <Input 
                    type="number" 
                    step="0.000001"
                    value={startLat}
                    onChange={(e) => setStartLat(e.target.value)}
                    placeholder="18.475"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Longitude</label>
                  <Input 
                    type="number" 
                    step="0.000001"
                    value={startLng}
                    onChange={(e) => setStartLng(e.target.value)}
                    placeholder="73.860"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">End Latitude</label>
                  <Input 
                    type="number" 
                    step="0.000001"
                    value={endLat}
                    onChange={(e) => setEndLat(e.target.value)}
                    placeholder="18.485"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Longitude</label>
                  <Input 
                    type="number" 
                    step="0.000001"
                    value={endLng}
                    onChange={(e) => setEndLng(e.target.value)}
                    placeholder="73.870"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max Detour (km)</label>
                <Input 
                  type="number"
                  value={maxDetourKm}
                  onChange={(e) => setMaxDetourKm(e.target.value)}
                  placeholder="10"
                />
              </div>
              
              <Button 
                onClick={handleSearch}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search for Food Shops'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results ({shops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-2 text-gray-600">Searching for shops...</p>
              </div>
            ) : shops.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="mx-auto h-12 w-12 opacity-50 mb-2" />
                <p>No shops found</p>
                <p className="text-sm">Click "Search" to find food shops along the route</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shops.map((shop, index) => (
                  <div key={shop.id || index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{shop.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{shop.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {shop.distanceFromRoute?.toFixed(2)} km from route
                          </span>
                          <span>Est. {shop.estimatedTime} min</span>
                          {shop.isOnRoute && (
                            <span className="text-green-600 font-medium">✓ On Route</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {shop.type}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          Detour: {shop.detourDistance?.toFixed(2)} km
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                      <div>Coordinates: {shop.coordinates?.lat}, {shop.coordinates?.lng}</div>
                      <div>Position: {(shop.routePosition * 100).toFixed(0)}% along route</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-6 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-sm">📋 Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Test Coordinates (Near Zeo's Pizza):</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Start: 18.475, 73.860</li>
              <li>End: 18.485, 73.870</li>
              <li>Zeo's Location: 18.480321, 73.863038</li>
              <li>Expected Distance: ~0.6km from route midpoint</li>
            </ul>
            <p className="mt-3"><strong>Check Browser Console (F12) for:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>🔍 Fetching vendors from SUPABASE...</li>
              <li>📊 Found X active vendors</li>
              <li>✅ Fallback mode or regular mode logs</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}














