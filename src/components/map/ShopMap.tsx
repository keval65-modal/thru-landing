"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ShopMarkerData } from '@/types/map-types';
import { ShopInfoWindow } from './ShopInfoWindow';

interface ShopMapProps {
  shops: ShopMarkerData[];
  userLocation?: { latitude: number; longitude: number };
  onShopSelect?: (shop: ShopMarkerData) => void;
  className?: string;
}

// Category colors
const CATEGORY_COLORS = {
  cafe: '#8B4513',
  restaurant: '#FF6B35',
  medical: '#DC143C',
  grocery: '#32CD32',
  other: '#6B7280'
};

export function ShopMap({ shops, userLocation, onShopSelect, className = '' }: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<ShopMarkerData | null>(null);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google?.maps) {
      setError('Google Maps is not loaded');
      setIsLoading(false);
      return;
    }

    if (!mapRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      // Determine initial center
      let center = { lat: 12.9716, lng: 77.5946 }; // Default: Bangalore
      
      if (userLocation) {
        center = { lat: userLocation.latitude, lng: userLocation.longitude };
      } else if (shops.length > 0) {
        center = { lat: shops[0].location.latitude, lng: shops[0].location.longitude };
      }

      // Initialize map
      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;

      // Create info window
      infoWindowRef.current = new google.maps.InfoWindow();

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add shop markers
      const bounds = new google.maps.LatLngBounds();

      shops.forEach((shop) => {
        const position = { lat: shop.location.latitude, lng: shop.location.longitude };
        
        // Get category color
        const color = CATEGORY_COLORS[shop.category] || CATEGORY_COLORS.other;
        const opacity = shop.isOpen ? 1 : 0.4;

        // Create custom SVG marker
        const svgMarker = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: opacity,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        };

        const marker = new google.maps.Marker({
          position,
          map,
          title: shop.name,
          icon: svgMarker,
          opacity: shop.isOpen ? 1 : 0.6
        });

        // Add click listener
        marker.addListener('click', () => {
          setSelectedShop(shop);
          if (onShopSelect) {
            onShopSelect(shop);
          }

          // Create info window content container
          const contentDiv = document.createElement('div');
          contentDiv.id = `info-window-${shop.id}`;
          
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(contentDiv);
            infoWindowRef.current.open(map, marker);
          }
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      });

      // Add user location marker if available
      if (userLocation) {
        const userMarker = new google.maps.Marker({
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 1000
        });

        markersRef.current.push(userMarker);
        bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      }

      // Fit map to show all markers
      if (shops.length > 0 || userLocation) {
        map.fitBounds(bounds);
        
        // Add padding
        const padding = { top: 80, right: 50, bottom: 100, left: 50 };
        map.fitBounds(bounds, padding);
        
        // Ensure minimum zoom level
        const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 15) {
            map.setZoom(15);
          }
        });
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [shops, userLocation, onShopSelect]);

  // Render info window content when selectedShop changes
  useEffect(() => {
    if (selectedShop) {
      const contentDiv = document.getElementById(`info-window-${selectedShop.id}`);
      if (contentDiv) {
        const root = document.createElement('div');
        contentDiv.appendChild(root);
        
        // Use React to render the info window content
        import('react-dom/client').then(({ createRoot }) => {
          const reactRoot = createRoot(root);
          reactRoot.render(<ShopInfoWindow shop={selectedShop} />);
        });
      }
    }
  }, [selectedShop]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
