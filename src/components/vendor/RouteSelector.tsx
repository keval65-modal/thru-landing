"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Vendor } from '@/lib/supabase/vendor-service';
import Script from 'next/script';

interface RouteSelectorProps {
  vendor: Vendor;
  onRouteSet: (route: {
    departureTime: Date;
    destination: string;
    destinationCoords: { lat: number; lng: number };
  }) => void;
}

export default function RouteSelector({ vendor, onRouteSet }: RouteSelectorProps) {
  const [departureTime, setDepartureTime] = useState('');
  const [destination, setDestination] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [forceLegacyAutocomplete, setForceLegacyAutocomplete] = useState(false);

  const startContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setMapLoaded(true);
      initAutocomplete();
    }
  }, []);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setStartCoords({ lat, lng });
          
          // Reverse geocode to get address
          if (window.google?.maps?.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            try {
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results[0]) {
                setStartLocation(response.results[0].formatted_address);
              } else {
                setStartLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
            } catch (e) {
              console.error('Geocoder failed', e);
              setStartLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } else {
            setStartLocation('Current Location');
          }
          setLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoadingLocation(false);
        }
      );
    } else {
      setLoadingLocation(false);
    }

    // Set default departure time to current time
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setDepartureTime(`${hours}:${minutes}`);
  }, [mapLoaded, forceLegacyAutocomplete]);

  async function initAutocomplete() {
    if (!window.google?.maps) return;
    
    if (forceLegacyAutocomplete) {
      setupLegacyAutocomplete();
      return;
    }

    try {
      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places") as any;
      
      if (PlaceAutocompleteElement) {
        if (startContainerRef.current) {
          startContainerRef.current.innerHTML = '';
          const startEl = new PlaceAutocompleteElement();
          startContainerRef.current.appendChild(startEl);
          startEl.addEventListener('gmp-error', () => setForceLegacyAutocomplete(true));
          startEl.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;
            if (place) {
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
              setStartLocation(place.formattedAddress || "");
              if (place.location) setStartCoords({ lat: place.location.lat(), lng: place.location.lng() });
            }
          });
        }

        if (destContainerRef.current) {
          destContainerRef.current.innerHTML = '';
          const destEl = new PlaceAutocompleteElement();
          destContainerRef.current.appendChild(destEl);
          destEl.addEventListener('gmp-error', () => setForceLegacyAutocomplete(true));
          destEl.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;
            if (place) {
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
              setDestination(place.formattedAddress || "");
              if (place.location) setDestinationCoords({ lat: place.location.lat(), lng: place.location.lng() });
            }
          });
        }
      } else {
        throw new Error("No PlaceAutocompleteElement");
      }
    } catch (e) {
      setForceLegacyAutocomplete(true);
    }
  }

  function setupLegacyAutocomplete() {
    if (!window.google?.maps?.places) return;

    if (startContainerRef.current) {
       startContainerRef.current.innerHTML = '<input id="legacy-start" class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter start location" />';
       const input = document.getElementById('legacy-start') as HTMLInputElement;
       const autocomplete = new google.maps.places.Autocomplete(input, { fields: ['formatted_address', 'geometry'] });
       autocomplete.addListener('place_changed', () => {
         const place = autocomplete.getPlace();
         if (place?.formatted_address) {
            setStartLocation(place.formatted_address);
            if (place.geometry?.location) setStartCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
         }
       });
    }

    if (destContainerRef.current) {
       destContainerRef.current.innerHTML = '<input id="legacy-dest" class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter destination address" />';
       const input = document.getElementById('legacy-dest') as HTMLInputElement;
       const autocomplete = new google.maps.places.Autocomplete(input, { fields: ['formatted_address', 'geometry'] });
       autocomplete.addListener('place_changed', () => {
         const place = autocomplete.getPlace();
         if (place?.formatted_address) {
            setDestination(place.formatted_address);
            if (place.geometry?.location) setDestinationCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
         }
       });
    }
  }

  function handleMapLoad() {
    setMapLoaded(true);
    initAutocomplete();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!departureTime || !destination || !destinationCoords) {
      return;
    }

    // Parse departure time
    const [hours, minutes] = departureTime.split(':');
    const departureDate = new Date();
    departureDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onRouteSet({
      departureTime: departureDate,
      destination,
      destinationCoords
    });
  }

  return (
    <Card className="p-6">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={handleMapLoad}
        strategy="afterInteractive"
      />

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Plan Your Route</h2>
        <p className="text-gray-600 text-sm">
          Tell us when you're leaving and where you're headed so we can prepare your order for pickup.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Start Location */}
        <div>
          <Label htmlFor="start-location" className="flex items-center gap-2 mb-2">
            <Navigation className="h-4 w-4" />
            Start Location
          </Label>
          <div className="relative">
            <div ref={startContainerRef} className="w-full" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none">
              {loadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>
          </div>
        </div>

        {/* Departure Time */}
        <div>
          <Label htmlFor="departure-time" className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" />
            Departure Time
          </Label>
          <Input
            id="departure-time"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
            className="text-base"
          />
          <p className="text-xs text-gray-500 mt-1">
            When will you leave your current location?
          </p>
        </div>

        {/* Destination */}
        <div>
          <Label htmlFor="destination" className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            Destination
          </Label>
          <div ref={destContainerRef} className="w-full" />
          <p className="text-xs text-gray-500 mt-1">
            Where are you heading after picking up your order?
          </p>
        </div>

        {/* Pickup Location Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-sm text-blue-900 mb-1">Pickup Location</h3>
          <p className="text-sm text-blue-800">{vendor.name}</p>
          <p className="text-xs text-blue-700 mt-1">{vendor.address}</p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!departureTime || !destination || !destinationCoords}
        >
          Continue to {vendor.categories?.some(c => c.toLowerCase().includes('grocery')) ? 'Shopping' : 'Menu'}
        </Button>
      </form>
    </Card>
  );
}
