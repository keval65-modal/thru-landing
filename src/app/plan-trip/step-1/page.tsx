
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Search as SearchIcon, MapPin, LocateFixed, ArrowRightLeft, Loader2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

function PlanTripStep1PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [destinationQuery, setDestinationQuery] = React.useState("");
  const [selectedDestination, setSelectedDestination] = React.useState<string | null>(null);
  const [startLocationQuery, setStartLocationQuery] = React.useState("");
  const [selectedStartLocation, setSelectedStartLocation] = React.useState<string | null>(null);
  const [maxDetourKm, setMaxDetourKm] = React.useState<number>(5);

  const [isGoogleMapsScriptLoaded, setIsGoogleMapsScriptLoaded] = React.useState(false);
  const [googleScriptLoadError, setGoogleScriptLoadError] = React.useState<string | null>(null);
  const [isInitializingStartAutocomplete, setIsInitializingStartAutocomplete] = React.useState(false);
  const [isInitializingDestAutocomplete, setIsInitializingDestAutocomplete] = React.useState(false);
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = React.useState(false);
  const [isFetchingCurrentLocationAddress, setIsFetchingCurrentLocationAddress] = React.useState(false);

  const startInputRef = React.useRef<HTMLInputElement>(null);
  const destinationInputRef = React.useRef<HTMLInputElement>(null);
  const startAutocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Get location from home page URL parameters
  React.useEffect(() => {
    const startParam = searchParams.get('start');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    
    if (startParam) {
      console.log(`[Step 1] Setting start location from home page: ${startParam}`);
      setStartLocationQuery(startParam);
      setSelectedStartLocation(startParam);
    }
    
    if (latParam && lngParam) {
      console.log(`[Step 1] Got coordinates from home page: ${latParam}, ${lngParam}`);
      // Store coordinates for potential use
      (window as any).homePageCoordinates = {
        lat: parseFloat(latParam),
        lng: parseFloat(lngParam)
      };
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("[Step 1] GOOGLE_MAPS_API_KEY is not set. Autocomplete and maps features will be disabled. Proceeding allowed based on manual input.");
      setIsGoogleMapsScriptLoaded(true); // Allow proceeding if no key
    }
  }, [GOOGLE_MAPS_API_KEY]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && GOOGLE_MAPS_API_KEY) {
      (window as any).initMapCallbackForPlanTripStep1 = () => {
        console.log("%c[Step 1] initMapCallbackForPlanTripStep1 CALLED.", "color: green; font-weight: bold;");
        if (typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined' && typeof window.google.maps.places !== 'undefined') {
          setIsGoogleMapsScriptLoaded(true);
          setGoogleScriptLoadError(null);
          console.log("%c[Step 1] Google Maps API and Places library available via CALLBACK.", "color: green;");
        } else {
          const errMsg = "[Step 1] initMapCallbackForPlanTripStep1 called, but window.google.maps.places not available.";
          console.error(errMsg);
          setGoogleScriptLoadError(errMsg);
          setIsGoogleMapsScriptLoaded(false);
        }
      };
    }
    return () => {
        if (typeof window !== 'undefined') {
            delete (window as any).initMapCallbackForPlanTripStep1;
        }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  React.useEffect(() => {
    if (isGoogleMapsScriptLoaded && GOOGLE_MAPS_API_KEY && startInputRef.current && !startAutocompleteRef.current) {
      setIsInitializingStartAutocomplete(true);
      try {
        startAutocompleteRef.current = new window.google.maps.places.Autocomplete(startInputRef.current);
        startAutocompleteRef.current.addListener("place_changed", () => {
          const place = startAutocompleteRef.current?.getPlace();
          if (place && (place.formatted_address || place.name)) {
            const newStartLocation = place.formatted_address || place.name || "";
            setSelectedStartLocation(newStartLocation);
            setStartLocationQuery(newStartLocation);
          } else { if (startLocationQuery.trim() === "") setSelectedStartLocation(null); }
        });
      } catch (error) { console.error("[Step 1] Error initializing Google Maps Autocomplete for start:", error);
      } finally { setIsInitializingStartAutocomplete(false); }
    }
  }, [isGoogleMapsScriptLoaded, GOOGLE_MAPS_API_KEY, startLocationQuery]);

  React.useEffect(() => {
    if (isGoogleMapsScriptLoaded && GOOGLE_MAPS_API_KEY && destinationInputRef.current && !destAutocompleteRef.current) {
      setIsInitializingDestAutocomplete(true);
      try {
        destAutocompleteRef.current = new window.google.maps.places.Autocomplete(destinationInputRef.current);
        destAutocompleteRef.current.addListener("place_changed", () => {
          const place = destAutocompleteRef.current?.getPlace();
          if (place && (place.formatted_address || place.name)) {
            const newDestination = place.formatted_address || place.name || "";
            setSelectedDestination(newDestination);
            setDestinationQuery(newDestination);
          } else { if (destinationQuery.trim() === "") setSelectedDestination(null); }
        });
      } catch (error) { console.error("[Step 1] Error initializing Google Maps Autocomplete for destination:", error);
      } finally { setIsInitializingDestAutocomplete(false); }
    }
  }, [isGoogleMapsScriptLoaded, GOOGLE_MAPS_API_KEY, destinationQuery]);

  const mapsApiReadyOrNotNeeded = React.useMemo(() => 
    !GOOGLE_MAPS_API_KEY || (!!GOOGLE_MAPS_API_KEY && isGoogleMapsScriptLoaded),
    [GOOGLE_MAPS_API_KEY, isGoogleMapsScriptLoaded]
  );

  const canContinue = React.useMemo(() => {
    const startFilled = !!(selectedStartLocation || startLocationQuery.trim());
    const destFilled = !!(selectedDestination || destinationQuery.trim());
    return startFilled && destFilled && mapsApiReadyOrNotNeeded && !googleScriptLoadError;
  }, [selectedStartLocation, startLocationQuery, selectedDestination, destinationQuery, mapsApiReadyOrNotNeeded, googleScriptLoadError]);

  React.useEffect(() => {
    console.log('[Step 1 Debug] Button status check:', {
      startLocationQuery: startLocationQuery.trim(), selectedStartLocation,
      destinationQuery: destinationQuery.trim(), selectedDestination,
      hasGoogleMapsApiKey: !!GOOGLE_MAPS_API_KEY, isGoogleMapsScriptLoaded,
      googleScriptLoadError, mapsApiReadyOrNotNeeded, canContinue, maxDetourKm
    });
  }, [selectedStartLocation, startLocationQuery, selectedDestination, destinationQuery, isGoogleMapsScriptLoaded, canContinue, GOOGLE_MAPS_API_KEY, googleScriptLoadError, maxDetourKm]);


  async function fetchAddressForCurrentLocation(latitude: number, longitude: number) {
    console.log(`[Step 1] API Key check:`, {
      hasKey: !!GOOGLE_MAPS_API_KEY,
      keyLength: GOOGLE_MAPS_API_KEY?.length || 0,
      keyPrefix: GOOGLE_MAPS_API_KEY?.substring(0, 10) || 'undefined',
      isPlaceholder: GOOGLE_MAPS_API_KEY === 'placeholder_google_maps_key'
    });
    
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'placeholder_google_maps_key') {
      const fallbackLocation = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (API Key not configured)`;
      setStartLocationQuery(fallbackLocation);
      setSelectedStartLocation(fallbackLocation);
      setIsFetchingCurrentLocationAddress(false);
      setIsFetchingCurrentLocation(false);
      return;
    }
    
    setIsFetchingCurrentLocationAddress(true);
    
    try {
      console.log(`[Step 1] Fetching address for coordinates: ${latitude}, ${longitude}`);
      
      // Try using Places API first (client-side)
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };
        
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const fetchedAddress = results[0].formatted_address;
            console.log(`[Step 1] Successfully fetched address via Places API: ${fetchedAddress}`);
            setStartLocationQuery(fetchedAddress);
            setSelectedStartLocation(fetchedAddress);
          } else {
            console.error(`[Step 1] Places API geocoding error: ${status}`);
            const errorLocation = `Address not found (${status}) - Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`;
            setStartLocationQuery(errorLocation);
            setSelectedStartLocation(errorLocation);
          }
          setIsFetchingCurrentLocationAddress(false);
          setIsFetchingCurrentLocation(false);
        });
        return;
      }
      
      // Fallback to Geocoding API (server-side)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&region=IN`;
      
      console.log(`[Step 1] Request URL:`, url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`[Step 1] Geocoding API response:`, data);
      console.log(`[Step 1] Response status:`, response.status);
      console.log(`[Step 1] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        const fetchedAddress = data.results[0].formatted_address;
        console.log(`[Step 1] Successfully fetched address: ${fetchedAddress}`);
        setStartLocationQuery(fetchedAddress);
        setSelectedStartLocation(fetchedAddress);
      } else {
        console.error(`[Step 1] Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
        
        // Provide more specific error messages
        let errorMessage = '';
        switch (data.status) {
          case 'REQUEST_DENIED':
            errorMessage = 'API Key invalid or Geocoding API not enabled';
            break;
          case 'OVER_QUERY_LIMIT':
            errorMessage = 'API quota exceeded';
            break;
          case 'ZERO_RESULTS':
            errorMessage = 'No address found for these coordinates';
            break;
          default:
            errorMessage = data.status;
        }
        
        const errorLocation = `Address not found (${errorMessage}) - Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`;
        setStartLocationQuery(errorLocation);
        setSelectedStartLocation(errorLocation);
      }
    } catch (error) {
      console.error(`[Step 1] Network error fetching address:`, error);
      const networkErrorLocation = `Could not fetch address - Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`;
      setStartLocationQuery(networkErrorLocation);
      setSelectedStartLocation(networkErrorLocation);
    } finally {
      setIsFetchingCurrentLocationAddress(false);
      setIsFetchingCurrentLocation(false);
    }
  }

  const handleUseCurrentLocation = async () => {
    setIsFetchingCurrentLocation(true); setIsFetchingCurrentLocationAddress(false);
    setStartLocationQuery(""); setSelectedStartLocation(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { fetchAddressForCurrentLocation(position.coords.latitude, position.coords.longitude); },
        (error) => { const errorMsg = "Error fetching location"; setStartLocationQuery(errorMsg); setSelectedStartLocation(errorMsg);
          setIsFetchingCurrentLocation(false); setIsFetchingCurrentLocationAddress(false); alert("Could not get current location."); }
      );
    } else { const errorMsg = "Geolocation not supported"; setStartLocationQuery(errorMsg); setSelectedStartLocation(errorMsg);
      setIsFetchingCurrentLocation(false); setIsFetchingCurrentLocationAddress(false); alert("Geolocation not supported by this browser."); }
  };

  const handleSwapLocations = () => {
    const currentStartQuery = startLocationQuery; const currentSelectedStart = selectedStartLocation;
    const currentDestQuery = destinationQuery; const currentSelectedDest = selectedDestination;
    setStartLocationQuery(currentDestQuery); setSelectedStartLocation(currentSelectedDest);
    setDestinationQuery(currentStartQuery); setSelectedDestination(currentSelectedStart);
  };

  const handleContinue = () => {
    const finalStart = selectedStartLocation || startLocationQuery;
    const finalDest = selectedDestination || destinationQuery;
    if (finalStart.trim() && finalDest.trim()) {
      console.log("%c[Step 1] Proceeding to Step 2 with:", "color: blue; font-weight: bold;", { finalStart, finalDest, maxDetourKm });
      try {
        router.push(`/plan-trip/step-2?start=${encodeURIComponent(finalStart)}&destination=${encodeURIComponent(finalDest)}&maxDetourKm=${maxDetourKm}`);
        console.log("%c[Step 1] router.push CALLED successfully.", "color: blue;");
      } catch (e) {
        console.error("%c[Step 1] Error during router.push:", "color: red;", e);
        alert("Navigation error. Check console.");
      }
    } else {
      console.warn("[Step 1] Continue blocked: Start or destination is empty.", { finalStart, finalDest });
      alert("Please define both your start location and destination.");
    }
  };

  const handleDestinationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDestinationQuery(e.target.value);
    if (selectedDestination && e.target.value !== selectedDestination) setSelectedDestination(null);
  };

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartLocationQuery(e.target.value);
    if (selectedStartLocation && e.target.value !== selectedStartLocation) setSelectedStartLocation(null);
  };

  const startInputDisabledStatus = GOOGLE_MAPS_API_KEY ? (isInitializingStartAutocomplete || !isGoogleMapsScriptLoaded || !!googleScriptLoadError) : false;
  const destInputDisabledStatus = GOOGLE_MAPS_API_KEY ? (isInitializingDestAutocomplete || !isGoogleMapsScriptLoaded || !!googleScriptLoadError) : false;


  return (
    <>
      {GOOGLE_MAPS_API_KEY && (
        <Script
          id="google-maps-places-script-step1"
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMapCallbackForPlanTripStep1`}
          strategy="afterInteractive"
          async
          defer
          onLoad={() => {
            console.log("%c[Step 1] Google Maps script <Script> tag direct onLoad event fired.", "color: blue;");
            // Callback will handle setting isGoogleMapsScriptLoaded
          }}
          onError={(e: any) => {
            const errMsg = "[Step 1] Google Maps <Script> tag critical load error.";
            console.error(errMsg, "This often means API key issues (billing, restrictions, incorrect key) or network problems.", e);
            setGoogleScriptLoadError("Failed to load Google Maps. Address search disabled. Check console for API key and network errors.");
            setIsGoogleMapsScriptLoaded(false);
          }}
        />
      )}
      <div className="flex min-h-screen flex-col bg-background">
        <div className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 hover:bg-primary/80" onClick={() => router.push('/home')}><ChevronLeft className="h-6 w-6" /></Button>
                <h1 className="text-xl font-semibold">Step 1 of 5: Define Route &amp; Detour</h1>
            </div>
            <Button variant="ghost" size="icon" className="hover:bg-primary/80" onClick={() => router.push('/home')}>
                <Home className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex justify-around">
            {[1, 2, 3, 4, 5].map((step) => (<Button key={step} variant="default" size="sm" className={cn("rounded-full w-10 h-10 p-0 flex items-center justify-center", step === 1 ? "bg-foreground text-background hover:bg-foreground/90" : "bg-primary text-primary-foreground border border-primary-foreground hover:bg-primary/80")}>{step}</Button>))}
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <div className="relative">
            <div className="space-y-4">
              <div>
                <label htmlFor="startLocation" className="block text-sm font-medium text-foreground mb-1">Your Location (Start)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                  <Input id="startLocation" ref={startInputRef} type="text" placeholder="Search or use current location" value={startLocationQuery} onChange={handleStartInputChange} onBlur={() => { if(startLocationQuery && !selectedStartLocation) setSelectedStartLocation(startLocationQuery); }} className="pl-10" disabled={startInputDisabledStatus || isFetchingCurrentLocation} />
                  {(isInitializingStartAutocomplete || (GOOGLE_MAPS_API_KEY && !isGoogleMapsScriptLoaded && !startAutocompleteRef.current && !googleScriptLoadError)) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
                </div>
                <Button variant="link" className="p-0 h-auto text-xs mt-1 text-accent" onClick={handleUseCurrentLocation} disabled={isFetchingCurrentLocation || isFetchingCurrentLocationAddress}><LocateFixed className="mr-1 h-3 w-3"/>{(isFetchingCurrentLocation || isFetchingCurrentLocationAddress) ? "Fetching..." : "Use current location"}</Button>
              </div>
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-1">Destination</label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                  <Input id="destination" ref={destinationInputRef} type="text" placeholder="Search for area, street name..." value={destinationQuery} onChange={handleDestinationInputChange} onBlur={() => { if(destinationQuery && !selectedDestination) setSelectedDestination(destinationQuery); }} className="pl-10 border-input focus:border-primary focus:ring-primary" disabled={destInputDisabledStatus} />
                  {(isInitializingDestAutocomplete || (GOOGLE_MAPS_API_KEY && !isGoogleMapsScriptLoaded && !destAutocompleteRef.current && !googleScriptLoadError)) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
            <Button variant="outline" size="icon" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[-0.5rem] border-2 border-background hover:bg-muted" onClick={handleSwapLocations} aria-label="Swap start and destination" title="Swap start and destination"><ArrowRightLeft className="h-5 w-5 text-primary"/></Button>
          </div>
          
          <Card>
            <CardContent className="p-4 space-y-2">
                <Label htmlFor="detour-slider" className="text-sm font-medium text-foreground">Max Detour Preference: <span className="text-primary font-semibold">{maxDetourKm} km</span></Label>
                <Slider id="detour-slider" value={[maxDetourKm]} max={20} min={0.5} step={0.5} onValueChange={(value) => setMaxDetourKm(value[0])} className="mt-1" />
                <p className="text-xs text-muted-foreground">How far off your route are you willing to go for a stop?</p>
            </CardContent>
          </Card>

          {!GOOGLE_MAPS_API_KEY && (
            <p className="text-xs text-orange-600 bg-orange-100 p-2 rounded-md mt-1">
              Warning: Google Maps API Key is not configured. Address search/autocomplete disabled. Locations must be entered manually.
            </p>
          )}
          {googleScriptLoadError && (
             <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md mt-1">
                Map Error: {googleScriptLoadError}
            </p>
          )}
           {GOOGLE_MAPS_API_KEY && !isGoogleMapsScriptLoaded && !googleScriptLoadError && (
            <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing map services...
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-background sticky bottom-0">
          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" onClick={handleContinue} disabled={!canContinue}>
            Proceed to Item Selection
          </Button>
        </div>
      </div>
    </>
  );
}

export default function PlanTripStep1Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Loading...</p></div>}>
      <PlanTripStep1PageContent />
    </Suspense>
  );
}
