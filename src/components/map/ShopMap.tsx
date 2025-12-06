"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ShopMarkerData, ShopCategory } from '@/types/map-types';
import { getTodayHours } from '@/utils/operating-hours';

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

// Category labels and colors for badges
const CATEGORY_INFO = {
  [ShopCategory.CAFE]: { label: 'Cafe', color: '#f59e0b' },
  [ShopCategory.RESTAURANT]: { label: 'Restaurant', color: '#f97316' },
  [ShopCategory.MEDICAL]: { label: 'Medical', color: '#dc2626' },
  [ShopCategory.GROCERY]: { label: 'Grocery', color: '#16a34a' },
  [ShopCategory.OTHER]: { label: 'Other', color: '#6b7280' }
};

// Generate HTML content for info window
function createInfoWindowContent(shop: ShopMarkerData): string {
  const categoryInfo = CATEGORY_INFO[shop.category];
  const todayHours = getTodayHours(shop.operatingHours);
  
  // Determine redirect URL - go to dedicated vendor ordering page
  const redirectUrl = `/vendor/${shop.id}`;
  
  return `
    <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Header -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: start; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">${shop.name}</h3>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background-color: ${categoryInfo.color}20; color: ${categoryInfo.color}; white-space: nowrap;">
            ${categoryInfo.label}
          </span>
        </div>
        
        <!-- Status badge -->
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; ${shop.isOpen ? 'background-color: #16a34a; color: white;' : 'background-color: #9ca3af; color: white;'}">
          ${shop.isOpen ? 'Open Now' : 'Closed'}
        </span>
      </div>

      <!-- Product Images (if available) -->
      ${shop.images && shop.images.length > 0 ? `
        <div style="margin-bottom: 8px; display: flex; gap: 4px; overflow-x: auto;">
          ${shop.images.slice(0, 3).map((img: string) => `
            <img src="${img}" alt="Product" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" />
          `).join('')}
        </div>
      ` : ''}

      <!-- Cuisine (for restaurants/cafes) -->
      ${shop.cuisine && (shop.category === ShopCategory.RESTAURANT || shop.category === ShopCategory.CAFE) ? `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
          <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>${shop.cuisine}</span>
        </div>
      ` : ''}

      <!-- Address -->
      ${shop.address ? `
        <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
          <svg style="width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span style="line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${shop.address}</span>
        </div>
      ` : ''}

      <!-- Operating hours -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; color: #4b5563;">
        <svg style="width: 16px; height: 16px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>${todayHours}</span>
      </div>

      <!-- Action button -->
      <button 
        onclick="window.location.href='${redirectUrl}'"
        style="width: 100%; padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: ${shop.isOpen ? 'pointer' : 'not-allowed'}; ${shop.isOpen ? 'background-color: #000; color: white;' : 'background-color: #e5e7eb; color: #9ca3af;'} display: flex; align-items: center; justify-content: center; gap: 8px;"
        ${!shop.isOpen ? 'disabled' : ''}
      >
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        ${shop.isOpen ? 'Select & Order' : 'Closed'}
      </button>
    </div>
  `;
}

export function ShopMap({ shops, userLocation, onShopSelect, className = '' }: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (onShopSelect) {
            onShopSelect(shop);
          }

          // Set info window content as HTML string
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(createInfoWindowContent(shop));
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
