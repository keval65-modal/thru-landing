
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Check, MapPin, CreditCard, Banknote, Loader2, Navigation, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PlacedOrder, VendorOrderPortion, OrderItemDetail } from "@/app/interfaces/order"; 
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";

// Consistent interfaces
interface Item {
  id: string; name: string; category: string; imageUrl?: string; dataAiHint?: string;
  details?: string; price: number;
}

// Structure for items passed from cart
interface CartVendorItem {
  itemId: string;
  quantity: number;
  name?: string;
  price?: number;
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
}
interface CartVendorGroupForDisplay {
  vendorInfo: Vendor;
  items: CartVendorItem[];
}

// Import dummy data from separate file
import { type Vendor } from "@/lib/dummy-data";


const PLATFORM_FEE = 10.00;
const PAYMENT_GATEWAY_FEE = 5.00;

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


function PlanTripStep5PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [startLocation, setStartLocation] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);
  const [displayVendorGroups, setDisplayVendorGroups] = React.useState<CartVendorGroupForDisplay[]>([]);

  const [itemSubtotal, setItemSubtotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);

  const mapRef = React.useRef<HTMLDivElement>(null);
  const [isMapScriptLoaded, setIsMapScriptLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  const [rawSelectedVendorIdsString, setRawSelectedVendorIdsString] = React.useState<string>("");
  const [rawFinalItemsForCartString, setRawFinalItemsForCartString] = React.useState<string>("");
  const [rawMasterItemsListString, setRawMasterItemsListString] = React.useState<string>("[]");


  React.useEffect(() => {
    const start = searchParams.get("start");
    const dest = searchParams.get("destination");
    const vendorIdsStr = searchParams.get("selectedVendorIds");
    const finalItemsStr = searchParams.get("finalItemsForCart");
    const subtotalFromCart = searchParams.get("cartSubtotal");
    const masterItemsStr = searchParams.get("masterItemsListString") || "[]";

    setRawSelectedVendorIdsString(vendorIdsStr || "");
    setRawFinalItemsForCartString(finalItemsStr || "");
    setRawMasterItemsListString(masterItemsStr);

    if (!start || !dest || !vendorIdsStr || !finalItemsStr || !subtotalFromCart) {
      toast({ title: "Missing Information", description: "Required details for payment are missing.", variant: "destructive" });
      router.push(`/cart`);
      return;
    }

    setStartLocation(start);
    setDestination(dest);
    
    const parsedFinalItemsByVendor: Record<string, Array<{itemId: string, quantity: number}>> = JSON.parse(finalItemsStr);
    const parsedMasterItemsList: Item[] = JSON.parse(masterItemsStr);
    const masterItemsMap = new Map(parsedMasterItemsList.map(item => [item.id, item]));
    const vendorIds = vendorIdsStr.split(',');

    const subtotalNum = parseFloat(subtotalFromCart);
    if (!isNaN(subtotalNum)) setItemSubtotal(subtotalNum);
    
    const buildDisplayGroups = async () => {
        const vendorDetailsMap = new Map<string, Vendor>();
        // Fetch vendor details from Firestore only
        if (vendorIds.length > 0) {
            try {
                if (!db) {
                    console.warn("[Step 5] Firestore not initialized, skipping vendor fetch");
                } else {
                    const vendorQuery = query(collection(db, "vendors"), where(documentId(), "in", vendorIds));
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
                console.error("[Step 5] Error fetching/merging vendor details from Firestore:", error);
                toast({ title: "DB Error", description: "Could not fetch all vendor details.", variant: "destructive" });
            }
        }
        
        const tempDisplayVendorGroups: CartVendorGroupForDisplay[] = [];
        for (const vendorId of vendorIds) {
            const vendorInfo = vendorDetailsMap.get(vendorId);
            if (!vendorInfo) {
                console.warn(`[Step 5] Could not find any details for vendor ID ${vendorId}. It will be skipped.`);
                continue;
            }

            const itemsForThisVendor: CartVendorItem[] = (parsedFinalItemsByVendor[vendorId] || []).map(entry => {
                const masterItem = masterItemsMap.get(entry.itemId);
                return {
                    itemId: entry.itemId,
                    quantity: entry.quantity,
                    name: masterItem?.name || "Unknown Item",
                    price: masterItem?.price || 0,
                    imageUrl: masterItem?.imageUrl,
                    dataAiHint: masterItem?.dataAiHint,
                    details: masterItem?.details
                };
            });

            if (itemsForThisVendor.length > 0) {
                tempDisplayVendorGroups.push({ vendorInfo: vendorInfo, items: itemsForThisVendor });
            }
        }
        setDisplayVendorGroups(tempDisplayVendorGroups);
        setIsLoading(false);
    };
    
    buildDisplayGroups();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isMapScriptLoaded || !mapRef.current || !startLocation || !destination || isLoading) {
      return;
    }

    const vendorsWithLocation = displayVendorGroups
        .map(group => group.vendorInfo)
        .filter(vendor => (vendor.latitude && vendor.longitude) || vendor.address);

    const waypoints: google.maps.DirectionsWaypoint[] = vendorsWithLocation.map(vendor => ({
        location: (vendor.latitude && vendor.longitude) ? { lat: vendor.latitude, lng: vendor.longitude } : vendor.address!,
        stopover: true,
    }));

    try {
        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 20.5937, lng: 78.9629 }, // Default center
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
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
            if (status === window.google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
                setMapError(null);

                const route = result.routes[0];

                // Start marker
                new window.google.maps.Marker({
                    position: route.legs[0].start_location,
                    map,
                    label: { text: "A", color: "white", fontWeight: "bold" },
                    title: `Start: ${startLocation}`,
                    zIndex: 10
                });

                // End marker
                new window.google.maps.Marker({
                    position: route.legs[route.legs.length - 1].end_location,
                    map,
                    label: { text: "B", color: "white", fontWeight: "bold" },
                    title: `Destination: ${destination}`,
                    zIndex: 10
                });

                // Vendor markers
                const waypointOrder = route.waypoint_order || vendorsWithLocation.map((_, i) => i);
                
                waypointOrder.forEach((originalVendorIndex, stopIndex) => {
                    const vendor = vendorsWithLocation[originalVendorIndex];
                    const vendorName = vendor.shopName || vendor.name;
                    const waypointLocation = route.legs[stopIndex].end_location;
                    
                    const displayName = vendorName.split(',')[0];

                    const marker = new window.google.maps.Marker({
                        position: waypointLocation,
                        map,
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
                const errorMsg = "Could not calculate route with all stops. Status: " + status;
                setMapError(errorMsg);
                directionsService.route({ origin: startLocation, destination, travelMode: google.maps.TravelMode.DRIVING }, (res, stat) => {
                    if (stat === google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(res);
                    }
                });
            }
        });
    } catch (error: any) {
        setMapError("Map initialization failed: " + error.message);
    }

  }, [isMapScriptLoaded, isLoading, startLocation, destination, displayVendorGroups]);


  const handleConfirmAndPay = async () => {
    setIsPlacingOrder(true);
    const orderId = `THRU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const currentTime = new Date().toISOString();
    const vendorIdsInOrder = displayVendorGroups.map(group => group.vendorInfo.id);

    const vendorPortions: VendorOrderPortion[] = displayVendorGroups.map(group => {
      const items: OrderItemDetail[] = group.items.map(cartItem => {
        const itemDetail: OrderItemDetail = {
          itemId: cartItem.itemId,
          name: cartItem.name || "Unknown Item",
          quantity: cartItem.quantity,
          pricePerItem: cartItem.price || 0,
          totalPrice: (cartItem.price || 0) * cartItem.quantity,
        };

        if (cartItem.imageUrl) itemDetail.imageUrl = cartItem.imageUrl;
        if (cartItem.dataAiHint) itemDetail.dataAiHint = cartItem.dataAiHint;
        if (cartItem.details) itemDetail.details = cartItem.details;
        
        return itemDetail;
      });

      const vendorSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      const portion: VendorOrderPortion = {
        vendorId: group.vendorInfo.id,
        vendorName: group.vendorInfo.shopName || group.vendorInfo.name,
        vendorType: group.vendorInfo.type,
        status: "New",
        items,
        vendorSubtotal,
      };

      if (group.vendorInfo.address) portion.vendorAddress = group.vendorInfo.address;

      return portion;
    });

    const grandTotal = itemSubtotal + PLATFORM_FEE + PAYMENT_GATEWAY_FEE;

    const newOrder: PlacedOrder = {
      orderId,
      createdAt: currentTime,
      overallStatus: "New",
      paymentStatus: "Paid",
      grandTotal: grandTotal,
      platformFee: PLATFORM_FEE,
      paymentGatewayFee: PAYMENT_GATEWAY_FEE,
      vendorPortions,
      vendorIds: vendorIdsInOrder,
      customerInfo: { // Dummy customer info for now
        id: "cust-123",
        name: "Aman",
        phoneNumber: "+919876543210"
      }
    };

    if (startLocation) newOrder.tripStartLocation = startLocation;
    if (destination) newOrder.tripDestination = destination;


    try {
      if (!db) {
        toast({ title: "Database Not Available", description: "Firebase is not configured. Please check your environment variables.", variant: "destructive" });
        setIsPlacingOrder(false);
        return;
      }
      
      await setDoc(doc(db, "orders", orderId), newOrder);
      console.log("Order saved to Firestore with ID:", orderId);
      toast({ title: "Order Placed Successfully!", description: `Order ID #${orderId}. Preparing route...`, duration: 3000 });

      const queryParams = new URLSearchParams();
      if (startLocation) queryParams.set("start", startLocation);
      if (destination) queryParams.set("destination", destination);

      const vendorIdsForTracking = displayVendorGroups.map(group => group.vendorInfo.id);
      if (vendorIdsForTracking.length > 0) queryParams.set("vendorIds", vendorIdsForTracking.join(','));

      setTimeout(() => {
        router.push(`/order-tracking/${orderId}?${queryParams.toString()}`);
        setIsPlacingOrder(false);
      }, 2000);

    } catch (e: any) {
      console.error("Error saving order to Firestore:", e);
      toast({ title: "Order Placement Failed", description: `Could not save order: ${e.message}. Please try again.`, variant: "destructive" });
      setIsPlacingOrder(false);
    }
  };


  if (isLoading) {
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6"><Loader2 className="h-12 w-12 animate-pulse text-primary mb-4" /><p className="text-muted-foreground">Loading payment details...</p></div>);
  }

  const grandTotal = itemSubtotal + PLATFORM_FEE + PAYMENT_GATEWAY_FEE;

  const handleBackToCart = () => {
    const params = new URLSearchParams({
      start: startLocation || "",
      destination: destination || "",
      selectedVendorIds: rawSelectedVendorIdsString,
      finalItemsForCart: rawFinalItemsForCartString,
      cartSubtotal: itemSubtotal.toFixed(2),
      masterItemsListString: rawMasterItemsListString,
      maxDetourKm: searchParams.get("maxDetourKm") || "5",
      selectedGlobalItemsData: searchParams.get("selectedGlobalItemsData") || "{}",
      selectedShopSpecificItemsData: searchParams.get("selectedShopSpecificItemsData") || "{}",
      selectedGlobalItemsQuantities: searchParams.get("selectedGlobalItemsQuantities") || "{}",
      selectedShopSpecificItemsQuantities: searchParams.get("selectedShopSpecificItemsQuantities") || "{}"
    });
    router.push(`/cart?${params.toString()}`);
  };


  return (
    <>
    {GOOGLE_MAPS_API_KEY && (
        <Script
          id="google-maps-script-step5"
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker,directions`}
          strategy="afterInteractive"
          async
          defer
          onLoad={() => {
            console.log("Step 5: Google Maps script loaded.");
            setIsMapScriptLoaded(true);
          }}
          onError={(e) => {
            console.error("Step 5: Google Maps script failed to load.", e);
            setMapError("Failed to load Google Maps script. Map functionality will be limited.");
            setIsMapScriptLoaded(false);
          }}
        />
      )}
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 hover:bg-primary/80"
                onClick={handleBackToCart}
                disabled={isPlacingOrder}>
                <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold">Step 5 of 5: Confirm &amp; Pay</h1>
            </div>
            <Button variant="ghost" size="icon" className="hover:bg-primary/80" onClick={() => router.push('/home')}>
                <Home className="h-6 w-6" />
            </Button>
        </div>
        <div className="flex justify-around">
          {[1,2,3,4,5].map((step) => (
            <Button key={step} variant="default" size="sm" className={cn("rounded-full w-10 h-10 p-0 flex items-center justify-center",
                step === 5 ? "bg-foreground text-background hover:bg-foreground/90" :
                "bg-green-500 text-white hover:bg-green-600")}>
             {step < 5 ? <Check className="h-5 w-5" /> : "5"}
            </Button>))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto pb-24">
        <Card>
          <CardHeader><CardTitle className="text-lg">Final Route &amp; Stops</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-green-500 shrink-0" /><span className="font-medium text-foreground">From:</span>&nbsp;<span className="text-muted-foreground truncate">{startLocation}</span></div>
            {displayVendorGroups.map(group => (
                 <div key={group.vendorInfo.id} className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-orange-500 shrink-0" /><span className="font-medium text-foreground">Stop:</span>&nbsp;<span className="text-muted-foreground truncate">{group.vendorInfo.shopName || group.vendorInfo.name} ({group.vendorInfo.type})</span></div>
            ))}
            <div className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-red-500 shrink-0" /><span className="font-medium text-foreground">To:</span>&nbsp;<span className="text-muted-foreground truncate">{destination}</span></div>
             <div ref={mapRef} className="w-full h-64 rounded-md bg-muted mt-2 shadow">
                {isLoading && <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading map...</p></div>}
                {(!isLoading && !GOOGLE_MAPS_API_KEY) && <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">Map preview requires Google Maps API Key setup.</div>}
                {mapError && <div className="flex items-center justify-center h-full text-destructive p-4 text-center">{mapError}</div>}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Final Price Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Item Subtotal</span><span className="font-medium text-foreground">₹{itemSubtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span className="font-medium text-foreground">₹{PLATFORM_FEE.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Gateway Fee</span><span className="font-medium text-foreground">₹{PAYMENT_GATEWAY_FEE.toFixed(2)}</span></div>
            <p className="text-xs text-muted-foreground">Product prices are inclusive of GST.</p>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold"><span className="text-foreground">Grand Total</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Select Payment Method</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 items-center justify-center">
                <Button variant="outline" className="w-full sm:w-auto"><CreditCard className="mr-2 h-5 w-5"/> Credit/Debit Card</Button>
                <Button variant="outline" className="w-full sm:w-auto"><Banknote className="mr-2 h-5 w-5"/> UPI / Netbanking</Button>
                 <Image src="https://placehold.co/120x40.png" width={120} height={40} alt="Payment gateways logos like Visa, Mastercard, UPI" data-ai-hint="payment logos" />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">Secure payment processing.</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border-t bg-background sticky bottom-0 z-20">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" onClick={handleConfirmAndPay} disabled={isPlacingOrder || isLoading}>
          {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm &amp; Pay ₹{grandTotal.toFixed(2)}
        </Button>
      </div>
    </div>
    </>
  );
}

export default function PlanTripStep5Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading order summary...</p>
        </div>
      </div>
    }>
      <PlanTripStep5PageContent />
    </Suspense>
  );
}
