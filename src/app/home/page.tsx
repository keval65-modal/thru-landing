"use client";

import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MapPin, 
  ChevronRight, 
  GitFork, 
  ShoppingBasket, 
  BriefcaseMedical, 
  Utensils, 
  Gift, 
  PawPrint, 
  Wine,
  HomeIcon,
  ListOrdered,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  Check,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FeatureTour } from '@/components/feature-tour';
import BottomNav from '@/components/layout/bottom-nav';

export default function HomePage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const { toast } = useToast();
  const [showTour, setShowTour] = React.useState(false);

  const categories = [
    { id: 'food', name: 'Takeout Food', icon: Utensils, color: 'bg-orange-500' },
    { id: 'grocery', name: 'Grocery', icon: ShoppingBasket, color: 'bg-green-500' },
    { id: 'pharmacy', name: 'Pharmacy', icon: BriefcaseMedical, color: 'bg-blue-500' },
    { id: 'gifts', name: 'Gifts', icon: Gift, color: 'bg-pink-500' },
    { id: 'pet', name: 'Pet Supplies', icon: PawPrint, color: 'bg-purple-500' },
    { id: 'wine', name: 'Wine & Spirits', icon: Wine, color: 'bg-red-500' },
    { id: 'home', name: 'Home & Garden', icon: HomeIcon, color: 'bg-yellow-500' },
  ];

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Google Maps callback function
  useEffect(() => {
    (window as any).initGoogleMapsForHome = () => {
      console.log('[Home] Google Maps callback called');
      setIsGoogleMapsLoaded(true);
    };
  }, []);

  // Retry address fetching when Google Maps loads
  useEffect(() => {
    if (isGoogleMapsLoaded && location && !address) {
      console.log('[Home] Google Maps loaded, retrying address fetch');
      fetchAddressFromCoordinates(location.latitude, location.longitude).then(setAddress);
    }
  }, [isGoogleMapsLoaded, location, address]);

  // Fallback: try to fetch address after a delay even if Google Maps seems loaded
  useEffect(() => {
    if (location && !address) {
      const timer = setTimeout(() => {
        console.log('[Home] Fallback: attempting address fetch after delay');
        fetchAddressFromCoordinates(location.latitude, location.longitude).then(setAddress);
      }, 3000); // Wait 3 seconds

      return () => clearTimeout(timer);
    }
  }, [location, address]);

  async function fetchAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    setIsFetchingAddress(true);

    try {
      console.log(`[Home] Fetching address for coordinates: ${latitude}, ${longitude}`);

      // Use Places API (client-side) - this is already working for autocomplete
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        return new Promise((resolve) => {
          geocoder.geocode({ location: latlng }, (results, status) => {
            console.log(`[Home] Geocoding response - Status: ${status}, Results:`, results);
            if (status === 'OK' && results && results[0]) {
              const fetchedAddress = results[0].formatted_address;
              console.log(`[Home] Successfully fetched address via Places API: ${fetchedAddress}`);
              setIsFetchingAddress(false);
              resolve(fetchedAddress);
            } else {
              console.error(`[Home] Places API geocoding error: ${status}`, results);
              const errorLocation = `Address not found (${status}) - Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`;
              setIsFetchingAddress(false);
              resolve(errorLocation);
            }
          });
        });
      } else {
        // If Google Maps API is not loaded, show coordinates
        console.warn("Google Maps API not loaded. Using coordinates fallback.");
        const coordinateLocation = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (Loading address...)`;
        setIsFetchingAddress(false);
        return coordinateLocation;
      }
    } catch (error) {
      console.error(`[Home] Error fetching address:`, error);
      const errorLocation = `Could not fetch address - Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`;
      setIsFetchingAddress(false);
      return errorLocation;
    }
  }

  useEffect(() => {
    setIsMounted(true);
    if ('geolocation' in navigator) {
        setLocationError(null);
        setIsFetchingLocation(true);
        setAddress(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                const fetchedAddress = await fetchAddressFromCoordinates(latitude, longitude);
                setAddress(fetchedAddress);
                setLocationError(null);
                setIsFetchingLocation(false);
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED: setLocationError("Location access denied."); break;
                    case error.POSITION_UNAVAILABLE: setLocationError("Location information is unavailable."); break;
                    case error.TIMEOUT: setLocationError("Location request timed out."); break;
                    default: setLocationError("An unknown error occurred."); break;
                }
                setIsFetchingLocation(false);
                setIsFetchingAddress(false);
            }
        );
    }
  }, []); // Add empty dependency array to run only once

const handleFetchLocation = () => {
    if ('geolocation' in navigator) {
        setLocationError(null);
        setIsFetchingLocation(true);
        setAddress(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                const fetchedAddress = await fetchAddressFromCoordinates(latitude, longitude);
                setAddress(fetchedAddress);
                setLocationError(null);
                setIsFetchingLocation(false);
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED: setLocationError("Location access denied."); break;
                    case error.POSITION_UNAVAILABLE: setLocationError("Location information is unavailable."); break;
                    case error.TIMEOUT: setLocationError("Location request timed out."); break;
                    default: setLocationError("An unknown error occurred."); break;
                }
                setIsFetchingLocation(false);
                setIsFetchingAddress(false);
            }
        );
    }
};

const displayLocationInfo = () => {
    if (isFetchingLocation || isFetchingAddress) {
        return (
            <div className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {isFetchingLocation ? "Getting location..." : "Getting address..."}
            </div>
        );
    }
    
    if (locationError) {
        return <div className="text-xs text-red-500">{locationError}</div>;
    }
    
    if (address) {
        return <div className="text-xs text-muted-foreground truncate">{address}</div>;
    }
    
    return <div className="text-xs text-muted-foreground">Tap to get location</div>;
};

  const handleTourFinish = () => {
    // For now, just hide the tour
    // In a real app, you might want to store this preference
    setShowTour(false); // Still hide it for this session
  };

  const nextCategory = () => {
    setCurrentCategoryIndex((prev) => (prev + 1) % categories.length);
  };

  const prevCategory = () => {
    setCurrentCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);
  };

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams();
    if (address) {
      params.set('start', address);
    }
    if (location) {
      params.set('lat', location.latitude.toString());
      params.set('lng', location.longitude.toString());
    }
    params.set('category', categoryId);
    window.location.href = `/plan-trip/step-1?${params.toString()}`;
  };


  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Google Maps Script */}
      {GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={() => {
            console.log('[Home] Google Maps script loaded');
            setIsGoogleMapsLoaded(true);
            // Retry address fetching immediately when script loads
            if (location && !address) {
              console.log('[Home] Retrying address fetch after script load');
              fetchAddressFromCoordinates(location.latitude, location.longitude).then(setAddress);
            }
          }}
          onError={() => {
            console.error('[Home] Google Maps script failed to load');
            setIsGoogleMapsLoaded(false);
          }}
        />
      )}
      
      <FeatureTour open={showTour} onFinish={handleTourFinish} />
      <div className="flex-1 overflow-y-auto pb-20"> 
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex items-center">
            <div className="flex items-center" onClick={handleFetchLocation} style={{cursor: 'pointer'}}>
              <MapPin className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
              <div className="overflow-hidden">
                <div className="flex items-center text-sm font-medium text-foreground">
                  Current Location <ChevronRight className="h-4 w-4 opacity-50 ml-1" />
                </div>
                {displayLocationInfo()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/90 text-primary-foreground p-6 pt-4 text-center">
          <p className="text-sm">Let's go</p>
          <h1 className="text-5xl font-bold text-white" style={{WebkitTextStroke: '1px hsl(var(--primary))', paintOrder: 'stroke fill'}}>
            Thru
          </h1>
          <p className="text-sm mt-2 text-primary-foreground/80">Pre-order. Pick up. No queues.</p>
        </div>

        <div className="p-4 space-y-4">
          <div 
            className="rounded-lg overflow-hidden shadow-lg relative h-32 backdrop-blur-md bg-white/20 border border-white/30 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            onClick={() => {
              const params = new URLSearchParams();
              if (address) {
                params.set('start', address);
              }
              if (location) {
                params.set('lat', location.latitude.toString());
                params.set('lng', location.longitude.toString());
              }
              window.location.href = `/plan-trip/step-1?${params.toString()}`;
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-red-500/30"></div>
            <div className="absolute inset-0 bg-black/20"></div> {/* Dark overlay for visibility */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="text-white text-center">
                <h3 className="text-lg font-bold drop-shadow-2xl text-white">Pre-order. Pick up. No queues.</h3>
                <p className="text-xs font-medium drop-shadow-xl text-white/95">Skip the wait, save time</p>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Skip the wait, save time</h3>
                <p className="text-sm text-muted-foreground">Pre-order from multiple stores along your route</p>
              </div>
              <GitFork className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
              const params = new URLSearchParams();
              if (address) {
                params.set('start', address);
              }
              if (location) {
                params.set('lat', location.latitude.toString());
                params.set('lng', location.longitude.toString());
              }
              window.location.href = `/plan-trip/step-1?${params.toString()}`;
            }}>
              <GitFork className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Plan Trip</h3>
              <p className="text-xs text-muted-foreground">Start planning</p>
            </Card>
            <Card className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/orders'}>
              <ListOrdered className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">My Orders</h3>
              <p className="text-xs text-muted-foreground">Track orders</p>
            </Card>
          </div>

          {/* Categories Carousel */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Shop by Category</h3>
            <div className="relative">
              <div className="flex items-center space-x-2 overflow-hidden">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={prevCategory}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${currentCategoryIndex * 100}%)` }}
                  >
                    {categories.map((category, index) => {
                      const IconComponent = category.icon;
                      return (
                        <div key={category.id} className="w-full flex-shrink-0 px-2">
                          <Card 
                            className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleCategoryClick(category.id)}
                          >
                            <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{category.name}</h4>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={nextCategory}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Dots indicator */}
              <div className="flex justify-center mt-4 space-x-2">
                {categories.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentCategoryIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                    onClick={() => setCurrentCategoryIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
      <BottomNav />
    </div>
  );
}