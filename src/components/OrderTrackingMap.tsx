"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface VendorLocation {
  vendorId: string;
  vendorName: string;
  vendorAddress?: string;
  latitude: number;
  longitude: number;
}

interface OrderTrackingMapProps {
  vendors: VendorLocation[];
  userLocation?: { latitude: number; longitude: number };
  className?: string;
}

export function OrderTrackingMap({ vendors, userLocation, className = '' }: OrderTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google?.maps) {
      setError('Google Maps is not loaded');
      setIsLoading(false);
      return;
    }

    if (!mapRef.current || vendors.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // Initialize map
      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: vendors[0].latitude, lng: vendors[0].longitude },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
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

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add vendor markers
      const bounds = new google.maps.LatLngBounds();

      vendors.forEach((vendor, index) => {
        const position = { lat: vendor.latitude, lng: vendor.longitude };
        
        // Create custom marker with number
        const marker = new google.maps.Marker({
          position,
          map,
          title: vendor.vendorName,
          label: {
            text: `${index + 1}`,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#F06A5D',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${vendor.vendorName}</h3>
              ${vendor.vendorAddress ? `<p style="margin: 0; font-size: 12px; color: #666;">${vendor.vendorAddress}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          // Close all other info windows
          markersRef.current.forEach(m => {
            const iw = (m as any).infoWindow;
            if (iw) iw.close();
          });
          infoWindow.open(map, marker);
        });

        (marker as any).infoWindow = infoWindow;
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
            scale: 12,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }
        });

        markersRef.current.push(userMarker);
        bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      }

      // Fit map to show all markers
      if (vendors.length > 1 || userLocation) {
        map.fitBounds(bounds);
        // Add padding
        const padding = { top: 50, right: 50, bottom: 50, left: 50 };
        map.fitBounds(bounds, padding);
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
    };
  }, [vendors, userLocation]);

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
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
