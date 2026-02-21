"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface FormState {
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  notes: string;
}

export function CustomerSignUpForm() {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    location: "",
    latitude: null,
    longitude: null,
    email: "",
    phone: "",
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
          types: ['address'],
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
          name: form.name,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          email: form.email,
          phone: form.phone,
          whatsappOptIn: form.whatsappOptIn,
          notes: form.notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok !== false) {
        toast({
          title: "Signed up successfully!",
          description: "We'll reach out to you when Thru goes live.",
        });
        setForm({
          name: "",
          location: "",
          latitude: null,
          longitude: null,
          email: "",
          phone: "",
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
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>
          Join us and get notified when Thru launches in your area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
          
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={locationInputRef}
              required
              placeholder="Your location (start typing address)"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="pl-10"
            />
          </div>

          <Input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />

          <Input
            required
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <div className="flex items-center justify-between rounded-md border bg-muted/60 p-3">
            <div>
              <Label htmlFor="customer-wa-optin" className="font-medium">
                WhatsApp updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Opt in to receive updates via WhatsApp.
              </p>
            </div>
            <Switch
              id="customer-wa-optin"
              checked={form.whatsappOptIn}
              onCheckedChange={(checked) => updateField("whatsappOptIn", checked)}
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
