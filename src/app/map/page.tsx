"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';
import { Loader2, MapIcon } from 'lucide-react';
import { ShopMap } from '@/components/map/ShopMap';
import { ShopMarkerData, ShopCategory } from '@/types/map-types';
import { getAllShopsForMap, subscribeToShopUpdates } from '@/lib/map-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/layout/bottom-nav';
import { useToast } from '@/hooks/use-toast';

// Category filter configuration
const CATEGORY_FILTERS = [
  { 
    category: 'all' as const, 
    label: 'All Shops', 
    icon: '🏪',
    color: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    activeColor: 'bg-gray-800 text-white'
  },
  { 
    category: ShopCategory.CAFE, 
    label: 'Cafes', 
    icon: '☕',
    color: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
    activeColor: 'bg-amber-600 text-white'
  },
  { 
    category: ShopCategory.RESTAURANT, 
    label: 'Restaurants', 
    icon: '🍽️',
    color: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
    activeColor: 'bg-orange-600 text-white'
  },
  { 
    category: ShopCategory.MEDICAL, 
    label: 'Medical', 
    icon: '⚕️',
    color: 'bg-red-50 hover:bg-red-100 text-red-800',
    activeColor: 'bg-red-600 text-white'
  },
  { 
    category: ShopCategory.GROCERY, 
    label: 'Grocery', 
    icon: '🛒',
    color: 'bg-green-50 hover:bg-green-100 text-green-800',
    activeColor: 'bg-green-600 text-white'
  }
];

export default function MapPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopMarkerData[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopMarkerData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<(ShopCategory | 'all')[]>(['all']);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load shops on mount
  useEffect(() => {
    loadShops();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToShopUpdates((updatedShops) => {
      setShops(updatedShops);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter shops when category selection changes
  useEffect(() => {
    if (selectedCategories.includes('all')) {
      setFilteredShops(shops);
    } else {
      const filtered = shops.filter(shop => 
        selectedCategories.includes(shop.category as ShopCategory)
      );
      setFilteredShops(filtered);
    }
  }, [shops, selectedCategories]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsFetchingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsFetchingLocation(false);
        }
      );
    }
  }, []);

  const loadShops = async () => {
    setIsLoadingShops(true);
    try {
      const fetchedShops = await getAllShopsForMap();
      setShops(fetchedShops);
    } catch (error) {
      console.error('Error loading shops:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shops. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingShops(false);
    }
  };

  const handleCategoryToggle = (category: ShopCategory | 'all') => {
    if (category === 'all') {
      setSelectedCategories(['all']);
    } else {
      setSelectedCategories(prev => {
        // Remove 'all' if selecting a specific category
        const withoutAll = prev.filter(c => c !== 'all');
        
        if (withoutAll.includes(category)) {
          // Remove category if already selected
          const updated = withoutAll.filter(c => c !== category);
          // If no categories selected, default to 'all'
          return updated.length === 0 ? ['all'] : updated;
        } else {
          // Add category
          return [...withoutAll, category];
        }
      });
    }
  };

  const handleGoogleMapsLoad = () => {
    setIsGoogleMapsLoaded(true);
  };

  return (
    <>
      {/* Load Google Maps Script */}
      {GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={handleGoogleMapsLoad}
          strategy="afterInteractive"
        />
      )}

      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="bg-white border-b shadow-sm z-10">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <MapIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Nearby Shops</h1>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORY_FILTERS.map((filter) => {
                const isSelected = selectedCategories.includes(filter.category);
                return (
                  <Badge
                    key={filter.category}
                    onClick={() => handleCategoryToggle(filter.category)}
                    className={`cursor-pointer whitespace-nowrap transition-colors ${
                      isSelected ? filter.activeColor : filter.color
                    }`}
                  >
                    <span className="mr-1">{filter.icon}</span>
                    {filter.label}
                  </Badge>
                );
              })}
            </div>

            {/* Shop count */}
            <div className="mt-2 text-sm text-muted-foreground">
              {isLoadingShops ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading shops...</span>
                </div>
              ) : (
                <span>
                  Showing {filteredShops.length} {filteredShops.length === 1 ? 'shop' : 'shops'}
                  {' '}({filteredShops.filter(s => s.isOpen).length} open now)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {!isGoogleMapsLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <ShopMap
              shops={filteredShops}
              userLocation={userLocation}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
