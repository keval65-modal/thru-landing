"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { vendorTypeOptions } from "@/lib/demo-data";

interface FormState {
  shopName: string;
  ownerName: string;
  shopCategory: string;
  phone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  whatsappOptIn: boolean;
  notes: string;
}

export function VendorSignUpForm() {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>({
    shopName: "",
    ownerName: "",
    shopCategory: "",
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
    whatsappOptIn: true,
    notes: "",
  });
  
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Wait for Google Maps to load
  useEffect(() => {
    const checkMapsLoaded = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Check if already loaded
    if (checkMapsLoaded()) {
      return;
    }

    // Wait for script to load
    const interval = setInterval(() => {
      if (checkMapsLoaded()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!checkMapsLoaded()) {
        console.warn('Google Maps Places API failed to load');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Initialize Google Maps Autocomplete when loaded
  useEffect(() => {
    if (!mapsLoaded || !locationInputRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['establishment', 'address'],
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setForm(prev => ({
            ...prev,
            location: place.formatted_address || prev.location,
            latitude: lat,
            longitude: lng
          }));
        }
      });
    } catch (error) {
      console.error('Error initializing Google Maps Autocomplete:', error);
      toast({
        title: "Location service unavailable",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
    }

    return () => {
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [mapsLoaded, toast]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If location is provided but no coordinates, try to geocode it
    if (form.location && (!form.latitude || !form.longitude)) {
      if (mapsLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: form.location }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
            // Retry submit after geocoding
            setTimeout(() => {
              const formElement = e.target as HTMLFormElement;
              formElement.requestSubmit();
            }, 100);
            return;
          }
        });
      }
      
      toast({
        title: "Location required",
        description: "Please select a location from the suggestions or enter a complete address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!form.latitude || !form.longitude) {
      toast({
        title: "Location required",
        description: "Please provide a valid location.",
        variant: "destructive",
      });
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/demo-shop-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: form.shopName,
          ownerName: form.ownerName,
          shopCategory: form.shopCategory,
          phone: form.phone,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          whatsappOptIn: form.whatsappOptIn,
          notes: form.notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok !== false) {
        toast({
          title: "Signed up successfully!",
          description: "We'll reach out to you when Thru goes live for vendor registrations.",
        });
        setForm({
          shopName: "",
          ownerName: "",
          shopCategory: "",
          phone: "",
          location: "",
          latitude: null,
          longitude: null,
          whatsappOptIn: true,
          notes: "",
        });
      } else {
        toast({
          title: "Couldn't save",
          description: data?.message || "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network issue",
        description: "Check your connection and retry.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="md:sticky md:top-4">
      <CardHeader>
        <CardTitle>Vendor Sign Up</CardTitle>
        <CardDescription>
          Register your shop to join Thru when we launch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            required
            placeholder="Shop Name"
            value={form.shopName}
            onChange={(e) => updateField("shopName", e.target.value)}
          />

          <Input
            required
            placeholder="Owner Name"
            value={form.ownerName}
            onChange={(e) => updateField("ownerName", e.target.value)}
          />

          <Select
            required
            value={form.shopCategory}
            onValueChange={(value) => updateField("shopCategory", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Shop Category" />
            </SelectTrigger>
            <SelectContent>
              {vendorTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            required
            type="tel"
            placeholder="WhatsApp Number"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <div className="flex items-center justify-between rounded-md border bg-muted/60 p-3">
            <div>
              <Label htmlFor="vendor-wa-optin" className="font-medium">
                Opt in to WhatsApp updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about vendor registration.
              </p>
            </div>
            <Switch
              id="vendor-wa-optin"
              checked={form.whatsappOptIn}
              onCheckedChange={(checked) => updateField("whatsappOptIn", checked)}
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={locationInputRef}
              required
              placeholder="Shop Location (start typing address)"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="pl-10"
            />
          </div>

          <Textarea
            placeholder="Any suggestions or feedback? (optional)"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
          />

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing up…" : "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
