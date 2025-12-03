"use client";

import * as React from "react";
import Script from "next/script";

interface RouteMapProps {
  startLocation: string;
  destination: string;
  vendorStops: Array<{
    id: string;
    name: string;
    address?: string;
    simulatedDetourKm: number;
  }>;
  maxDetourKm: number;
  className?: string;
}

export default function RouteMap({ 
  startLocation, 
  destination, 
  vendorStops, 
  maxDetourKm,
  className = ""
}: RouteMapProps) {
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const directionsServiceRef = React.useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = React.useRef<google.maps.DirectionsRenderer | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError("Google Maps API key not configured");
      return;
    }

    (window as any).initRouteMapCallback = () => {
      console.log("[RouteMap] Google Maps script loaded");
      if (typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined') {
        setIsGoogleMapsLoaded(true);
        setMapError(null);
      } else {
        setMapError("Google Maps API not available");
      }
    };

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).initRouteMapCallback;
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  React.useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || !GOOGLE_MAPS_API_KEY) return;

    try {
      // Initialize map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 18.5204, lng: 73.8567 }, // Default to Pune
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      // Initialize directions service and renderer
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: {
          strokeColor: "#3b82f6",
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      directionsRendererRef.current.setMap(mapInstanceRef.current);

      // Plot route and markers
      plotRouteAndMarkers();

    } catch (error) {
      console.error("[RouteMap] Error initializing map:", error);
      setMapError("Failed to initialize map");
    }
  }, [isGoogleMapsLoaded, startLocation, destination, vendorStops, GOOGLE_MAPS_API_KEY]);

  const plotRouteAndMarkers = async () => {
    if (!directionsServiceRef.current || !directionsRendererRef.current || !mapInstanceRef.current) return;

    try {
      // Create waypoints for vendor stops
      const waypoints = vendorStops
        .filter(vendor => vendor.address)
        .map(vendor => ({
          location: vendor.address!,
          stopover: true
        }));

      // Request directions
      const request: google.maps.DirectionsRequest = {
        origin: startLocation,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current!.setDirections(result);

          // Add custom markers
          addCustomMarkers(result);

          // Fit map to show all markers
          const bounds = new window.google.maps.LatLngBounds();
          
          // Add start and end points to bounds
          if (result.routes[0]?.legs[0]?.start_location) {
            bounds.extend(result.routes[0].legs[0].start_location);
          }
          if (result.routes[0]?.legs[result.routes[0].legs.length - 1]?.end_location) {
            bounds.extend(result.routes[0].legs[result.routes[0].legs.length - 1].end_location);
          }

          // Add vendor stop locations to bounds
          result.routes[0]?.legs.forEach((leg, index) => {
            if (index < waypoints.length) {
              const waypoint = waypoints[index];
              if (waypoint.location) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: waypoint.location }, (results, status) => {
                  if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
                    bounds.extend(results[0].geometry.location);
                    mapInstanceRef.current!.fitBounds(bounds);
                  }
                });
              }
            }
          });

          mapInstanceRef.current!.fitBounds(bounds);
        } else {
          console.error("[RouteMap] Directions request failed:", status);
          setMapError("Failed to calculate route");
        }
      });

    } catch (error) {
      console.error("[RouteMap] Error plotting route:", error);
      setMapError("Failed to plot route");
    }
  };

  const addCustomMarkers = (result: google.maps.DirectionsResult) => {
    if (!mapInstanceRef.current) return;

    // Start marker
    if (result.routes[0]?.legs[0]?.start_location) {
      new window.google.maps.Marker({
        position: result.routes[0].legs[0].start_location,
        map: mapInstanceRef.current,
        title: "Start Location",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="3"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });
    }

    // End marker
    if (result.routes[0]?.legs[result.routes[0].legs.length - 1]?.end_location) {
      new window.google.maps.Marker({
        position: result.routes[0].legs[result.routes[0].legs.length - 1].end_location,
        map: mapInstanceRef.current,
        title: "Destination",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="3"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">D</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });
    }

    // Vendor stop markers
    result.routes[0]?.legs.forEach((leg, index) => {
      if (index < vendorStops.length && vendorStops[index].address) {
        const vendor = vendorStops[index];
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode({ address: vendor.address! }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            new window.google.maps.Marker({
              position: results[0].geometry.location,
              map: mapInstanceRef.current,
              title: `${vendor.name} (${vendor.simulatedDetourKm.toFixed(1)}km detour)`,
              icon: {
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                  <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                    <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${index + 1}</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(28, 28),
                anchor: new window.google.maps.Point(14, 14)
              }
            });
          }
        });
      }
    });
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`aspect-video w-full rounded-lg overflow-hidden bg-muted shadow flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-muted-foreground mb-2">🗺️</div>
          <p className="text-sm text-muted-foreground">Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className={`aspect-video w-full rounded-lg overflow-hidden bg-muted shadow flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-destructive mb-2">⚠️</div>
          <p className="text-sm text-destructive">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`aspect-video w-full rounded-lg overflow-hidden bg-muted shadow ${className}`}>
        {!isGoogleMapsLoaded ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>
    </>
  );
}

