"use client";

import { useState, useEffect } from 'react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Vendor } from '@/lib/supabase/vendor-service';

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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
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
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!departureTime || !destination) {
      return;
    }

    // Parse departure time
    const [hours, minutes] = departureTime.split(':');
    const departureDate = new Date();
    departureDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // For now, use a simple destination (in production, use Google Places API)
    // Assuming destination is near the vendor for demo purposes
    const destinationCoords = {
      lat: vendor.location.latitude + 0.01,
      lng: vendor.location.longitude + 0.01
    };

    onRouteSet({
      departureTime: departureDate,
      destination,
      destinationCoords
    });
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Plan Your Route</h2>
        <p className="text-gray-600 text-sm">
          Tell us when you're leaving and where you're headed so we can prepare your order for pickup.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Location */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Navigation className="h-4 w-4" />
            Start Location
          </Label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            {loadingLocation ? (
              <p className="text-sm text-gray-600">Getting your location...</p>
            ) : currentLocation ? (
              <p className="text-sm text-gray-900">Current Location</p>
            ) : (
              <p className="text-sm text-gray-600">Location unavailable</p>
            )}
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
          disabled={!departureTime || !destination}
        >
          Continue to {vendor.categories?.some(c => c.toLowerCase().includes('grocery')) ? 'Shopping' : 'Menu'}
        </Button>
      </form>
    </Card>
  );
}
