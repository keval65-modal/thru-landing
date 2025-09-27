
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, MapPin, Home, Loader2, Navigation, User, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, documentId, getDocs } from "firebase/firestore";
// Removed DUMMY_VENDORS_BASE_DATA import - using only Firebase vendors 
import { predictArrivalTime, type PredictArrivalTimeOutput } from "@/ai/flows/predict-arrival-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Vendor {
  id: string;
  name: string;
  type: string;
  eta?: string; 
  imageUrl?: string;
  dataAiHint?: string;
  categories?: string[];
  inventory?: { [itemId: string]: boolean };
  address?: string; 
  shopName?: string;
  simulatedDetourKm?: number;
  latitude?: number;
  longitude?: number;
  isActiveOnThru?: boolean;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const getMarkerIcon = (vendorType: string, maps: typeof google.maps) => {
    let color = "#78716c"; // Default: stone-500
    switch (vendorType) {
        case "Grocery Store": color = "#22c55e"; break; // green-500
        case "Pharmacy": color = "#3b82f6"; break; // blue-500
        case "Cafe":
        case "Restaurant": color = "#f97316"; break; // orange-500
        case "Pet Store": color = "#8b5cf6"; break; // violet-500
        case "Liquor Store": color = "#a855f7"; break; // purple-500
        case "Gift Shop": color = "#ec4899"; break; // pink-500
        default: color = "#78716c";
    }

    const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 384 512">
            <path fill="${color}" stroke="#FFF" stroke-width="10" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0z"/>
        </svg>
    `;

    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgPin)}`,
        scaledSize: new maps.Size(32, 48),
        anchor: new maps.Point(16, 48),
        labelOrigin: new maps.Point(16, -8) // Position for the label, above the pin
    };
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const orderId = params.orderId as string;
  const startLocation = searchParams.get("start");
  const destination = searchParams.get("destination");
  const vendorIdsString = searchParams.get("vendorIds");

  const mapRef = React.useRef<HTMLDivElement>(null);
  const [isMapScriptLoaded, setIsMapScriptLoaded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = React.useState<Vendor[]>([]);
  const [proximityAlert, setProximityAlert] = React.useState<PredictArrivalTimeOutput | null>(null);
  const [isCheckingProximity, setIsCheckingProximity] = React.useState(false);
  
  React.useEffect(() => {
    const fetchVendorData = async () => {
        if (!vendorIdsString) {
            setSelectedVendors([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const ids = vendorIdsString.split(',');
        const vendorDetailsMap = new Map<string, Vendor>();
        // Use only Firebase vendor data

        if (ids.length > 0) {
            try {
                if (!db) {
                    console.warn("[Order Tracking] Firestore not initialized, skipping vendor fetch");
                } else {
                    console.log("[Order Tracking] Fetching vendor details from Firestore for IDs:", ids);
                    const vendorQuery = query(collection(db, "vendors"), where(documentId(), "in", ids));
                const querySnapshot = await getDocs(vendorQuery);
                querySnapshot.forEach(doc => {
                    const firestoreData = doc.data() as Partial<Vendor>;
                    // Use only Firebase data - no fallback to dummy data
                    const vendorData: Vendor = {
                        id: doc.id,
                        name: firestoreData.shopName || firestoreData.name || `Vendor ${doc.id}`,
                        shopName: firestoreData.shopName,
                        type: firestoreData.type || "Store",
                        categories: Array.isArray(firestoreData.categories) ? firestoreData.categories : [],
                        isActiveOnThru: firestoreData.isActiveOnThru === true,
                        simulatedDetourKm: firestoreData.simulatedDetourKm,
                        imageUrl: firestoreData.imageUrl,
                        dataAiHint: firestoreData.dataAiHint,
                        address: firestoreData.address,
                        latitude: firestoreData.latitude,
                        longitude: firestoreData.longitude,
                    };
                    vendorDetailsMap.set(doc.id, vendorData);
                });
                }
            } catch (error) {
                console.error("[Order Tracking] Error fetching/merging vendor details from Firestore:", error);
                toast({ title: "DB Error", description: "Could not fetch all vendor details.", variant: "destructive" });
            }
        }
        
        const vendors = ids.map(id => vendorDetailsMap.get(id)).filter(Boolean) as Vendor[];
        setSelectedVendors(vendors);
        console.log("[Order Tracking] Selected vendors for display and markers:", vendors.map(v => ({name: v.name, lat: v.latitude, lng: v.longitude, address: v.address})));
        setIsLoading(false);
    };

    fetchVendorData();
  }, [vendorIdsString, toast]);

  React.useEffect(() => {
    if (!isMapScriptLoaded || !mapRef.current || !startLocation || !destination || isLoading) {
      if(isMapScriptLoaded && !isLoading && (!startLocation || !destination)) {
         setMapError("Start or destination is missing.");
      }
      return;
    }
    
    setMapError(null);

    const vendorsWithLocation = selectedVendors.filter(vendor => (vendor.latitude && vendor.longitude) || vendor.address);
    const waypoints: google.maps.DirectionsWaypoint[] = vendorsWithLocation.map(vendor => {
        const location = (vendor.latitude && vendor.longitude) ? { lat: vendor.latitude, lng: vendor.longitude } : vendor.address!;
        return { location, stopover: true };
    });
    
    console.log("[Tracking Map] Initializing map. Waypoints to send to API:", waypoints.map(w => w.location));

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5, mapTypeControl: false, streetViewControl: false,
      });

      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({ map, suppressMarkers: true });
      const infoWindow = new window.google.maps.InfoWindow();

      const request: google.maps.DirectionsRequest = {
        origin: startLocation,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: waypoints.length > 0,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      directionsService.route(request, (result, status) => {
        console.log("[Tracking Map] Directions API response status:", status);
        if (status === window.google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result);
            setMapError(null);

            const route = result.routes[0];

            new window.google.maps.Marker({
                position: route.legs[0].start_location,
                map,
                label: { text: "A", color: "white", fontWeight: "bold" },
                title: "Start",
                zIndex: 10,
            });

            new window.google.maps.Marker({
                position: route.legs[route.legs.length - 1].end_location,
                map,
                label: { text: "B", color: "white", fontWeight: "bold" },
                title: "Destination",
                zIndex: 10,
            });

            const waypointOrder = route.waypoint_order || vendorsWithLocation.map((_, i) => i);
            waypointOrder.forEach((originalVendorIndex, stopIndex) => {
              const vendor = vendorsWithLocation[originalVendorIndex];
              const waypointLocation = route.legs[stopIndex].end_location;
              
              const vendorName = vendor.shopName || vendor.name;
              const displayName = vendorName.split(',')[0];

              const marker = new window.google.maps.Marker({
                  position: waypointLocation,
                  map: map,
                  title: vendorName,
                  icon: getMarkerIcon(vendor.type, window.google.maps),
                  label: {
                      text: displayName,
                      className: 'map-marker-label'
                  },
                  zIndex: 5
              });

              marker.addListener("click", () => {
                  const content = `
                      <div style="font-family: sans-serif; font-size: 14px; max-width: 250px; padding: 5px;">
                          <strong style="font-size: 16px; color: #333;">${vendorName}</strong>
                          <p style="margin: 4px 0 0; color: #666;">${vendor.type}</p>
                          ${vendor.address ? `<p style="margin: 4px 0 0; color: #888; font-style: italic;">${vendor.address}</p>` : ''}
                      </div>
                  `;
                  infoWindow.setContent(content);
                  infoWindow.open(map, marker);
              });
            });

        } else {
          const errorMsg = "Could not calculate route. Status: " + status;
          console.error("[Tracking Map] Directions request failed. Status:", status, "Waypoints attempted:", waypoints.map(w=>w.location));
          setMapError(errorMsg);
          directionsService.route({ origin: startLocation, destination, travelMode: google.maps.TravelMode.DRIVING }, (res, stat) => {
                if (stat === google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(res);
                }
            });
        }
      });
    } catch (error: any) {
       console.error("[Tracking Map] CRITICAL Error initializing map:", error);
      setMapError("Map initialization failed: " + error.message);
    }
  }, [isMapScriptLoaded, startLocation, destination, selectedVendors, isLoading]);


  const handleNavigateWithGoogleMaps = () => {
    if (!startLocation || !destination) {
      toast({
        title: "Error",
        description: "Start or destination location is missing for navigation.",
        variant: "destructive",
      });
      return;
    }

    const waypointsString = selectedVendors
      .map(vendor => (vendor.latitude && vendor.longitude) ? `${vendor.latitude},${vendor.longitude}` : vendor.address)
      .filter(Boolean) 
      .map(location => encodeURIComponent(location!))
      .join('|');

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(destination)}${waypointsString ? `&waypoints=${waypointsString}` : ''}&travelmode=driving`;

    console.log("OrderTracking: Opening Google Maps URL:", googleMapsUrl);
    window.open(googleMapsUrl, '_blank');
  };

  const handleCheckProximity = async () => {
    if (!startLocation || selectedVendors.length === 0) {
      toast({
        title: "Cannot Check Proximity",
        description: "Start location or vendor information is missing.",
        variant: "destructive",
      });
      return;
    }

    // For this demo, we'll check proximity to the first vendor in the list.
    const targetVendor = selectedVendors[0];
    if (!targetVendor.address) {
       toast({
        title: "Cannot Check Proximity",
        description: `Vendor ${targetVendor.name} does not have a valid address.`,
        variant: "destructive",
      });
      return;
    }

    setIsCheckingProximity(true);
    setProximityAlert(null);
    
    try {
      const result = await predictArrivalTime({
        customerAddress: startLocation,
        vendorAddress: targetVendor.address,
        orderId: orderId,
      });
      setProximityAlert(result);
      toast({
        title: "Proximity Checked",
        description: `Status: ${result.proximityStatus}`,
      });
    } catch (error) {
      console.error("Error checking proximity:", error);
      toast({
        title: "Error",
        description: "Could not check proximity due to an AI error.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingProximity(false);
    }
  };

  return (
    <>
      {GOOGLE_MAPS_API_KEY && (
        <Script
          id="google-maps-script"
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker,directions`}
          strategy="afterInteractive" 
          async
          defer
          onLoad={() => {
            console.log("OrderTracking: Google Maps script 'onLoad' event fired.");
            setIsMapScriptLoaded(true);
          }}
          onError={(e: Event) => { 
            const msg = "Failed to load Google Maps script. This is a critical error.";
            setMapError(msg + " Check API key, network, and console for specific errors from Google.");
            setIsMapScriptLoaded(false); 
          }}
        />
      )}
      <div className="flex min-h-screen flex-col bg-background">
        <div className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-primary/80"
              onClick={() => router.push('/home')}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold truncate">Track Order: #{orderId}</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 space-y-4">
          <Card className="flex-1 flex flex-col min-h-[300px] md:min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg">Your Route</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center relative">
              {isLoading && ( 
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Loading map and route...</p>
                </div>
              )}
              {mapError && ( 
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4 z-10 text-center">
                  <MapPin className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-destructive font-semibold">Map Error</p>
                  <p className="text-destructive-foreground text-sm">{mapError}</p>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full min-h-[250px] rounded-md bg-muted" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground">From: </span>
                  <span className="text-muted-foreground">{startLocation || "Not specified"}</span>
                </div>
              </div>
              {selectedVendors.length > 0 && (
                <div className="pl-0 mt-2">
                  <p className="font-medium text-foreground text-xs mb-1">Your selected shop(s) - approximate locations marked on map:</p>
                  {selectedVendors.map(vendor => (
                    <div key={vendor.id} className="flex items-start mb-1">
                       <MapPin className="inline h-3 w-3 mr-1.5 mt-0.5 text-orange-500 flex-shrink-0" />
                       <span className="text-muted-foreground text-xs">{vendor.shopName || vendor.name} ({vendor.type}) - {vendor.address || "Address unavailable"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                 <div>
                  <span className="font-medium text-foreground">To: </span>
                  <span className="text-muted-foreground">{destination || "Not specified"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
                <CardTitle className="text-base">Live Proximity Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Get a real-time ETA and generate alerts for you and the vendor. (This uses your starting location for the check).
                </p>
                <Button
                    onClick={handleCheckProximity}
                    disabled={isCheckingProximity || selectedVendors.length === 0}
                    className="w-full"
                >
                    {isCheckingProximity ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                    ) : (
                        "Check Proximity & Get ETA"
                    )}
                </Button>
                {proximityAlert && (
                    <div className="space-y-3 pt-4">
                        <Alert variant="default" className="bg-blue-50 border-blue-200">
                            <User className="h-4 w-4 !text-blue-600" />
                            <AlertTitle className="text-blue-800">For You (Customer)</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                {proximityAlert.notificationForCustomer}
                            </AlertDescription>
                        </Alert>
                        <Alert variant="default" className="bg-green-50 border-green-200">
                            <Store className="h-4 w-4 !text-green-600" />
                            <AlertTitle className="text-green-800">For the Vendor</AlertTitle>
                            <AlertDescription className="text-green-700">
                                {proximityAlert.notificationForVendor}
                            </AlertDescription>
                        </Alert>
                         <div className="text-xs text-muted-foreground pt-2">
                            <p><strong>Status:</strong> {proximityAlert.proximityStatus}</p>
                            <p><strong>Travel Time:</strong> {proximityAlert.travelTimeEstimateMinutes} minutes</p>
                         </div>
                    </div>
                )}
            </CardContent>
          </Card>

            <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base"
                onClick={handleNavigateWithGoogleMaps}
                disabled={isLoading || !!mapError || !startLocation || !destination}
            >
                <Navigation className="mr-2 h-5 w-5" /> Navigate with Google Maps
            </Button>

        </div>

        <div className="p-4 border-t bg-background sticky bottom-0 z-10">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base"
            onClick={() => router.push('/home')}
          >
            <Home className="mr-2 h-5 w-5" /> Back to Home
          </Button>
        </div>
      </div>
    </>
  );
}
