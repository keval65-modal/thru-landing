"use client";

import { useState, useEffect, useRef } from 'react';
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

  const startInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
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
  }, [mapLoaded]);

  function initAutocomplete() {
    if (!startInputRef.current || !destInputRef.current || !window.google?.maps?.places) return;

    // Start Location Autocomplete
    startAutocompleteRef.current = new google.maps.places.Autocomplete(startInputRef.current, {
      fields: ['formatted_address', 'geometry'],
      types: ['geocode', 'establishment']
    });

    startAutocompleteRef.current.addListener('place_changed', () => {
      const place = startAutocompleteRef.current?.getPlace();
      if (place?.formatted_address && place?.geometry?.location) {
        setStartLocation(place.formatted_address);
        setStartCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    });

    // Destination Autocomplete
    destAutocompleteRef.current = new google.maps.places.Autocomplete(destInputRef.current, {
      fields: ['formatted_address', 'geometry'],
      types: ['geocode', 'establishment']
    });

    destAutocompleteRef.current.addListener('place_changed', () => {
      const place = destAutocompleteRef.current?.getPlace();
      if (place?.formatted_address && place?.geometry?.location) {
        setDestination(place.formatted_address);
        setDestinationCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    });
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
        strategy="lazyOnload"
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
            <Input
              ref={startInputRef}
              id="start-location"
              type="text"
              placeholder={loadingLocation ? "Getting location..." : "Enter start location"}
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="pl-10"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
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
          <Input
            ref={destInputRef}
            id="destination"
            type="text"
            placeholder="Enter your destination address"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            className="text-base"
          />
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
