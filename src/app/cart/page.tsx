
"use client";

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/layout/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  MapPin,
  ShoppingCart,
  XCircle,
  Check,
  Loader2,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interfaces (consistent with other steps)
interface Item {
  id: string;
  name: string;
  category: string; 
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
  price: number;
  originalPrice?: number;
  vendorId?: string; 
}

interface Vendor {
  id: string;
  name: string;
  type: string;
  imageUrl?: string;
  dataAiHint?: string;
  categories?: string[];
  address?: string;
}

// Cart item structure derived from finalVendorPlan (from Step 3) or finalItemsForCart
interface CartVendorItem {
  itemId: string;
  quantity: number;
  name?: string; // Will be populated from masterItemsMap
  price?: number; // Will be populated from masterItemsMap
  imageUrl?: string; // Will be populated from masterItemsMap
  dataAiHint?: string; // Will be populated from masterItemsMap
  details?: string; // Will be populated from masterItemsMap
}

interface CartVendorGroup {
  vendorInfo: Vendor;
  items: CartVendorItem[];
  vendorSubtotal: number;
}


function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [startLocation, setStartLocation] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);
  const [cartVendorGroups, setCartVendorGroups] = React.useState<CartVendorGroup[]>([]);
  const [overallSubtotal, setOverallSubtotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Store raw strings for back navigation or re-passing
  const [rawSelectedVendorIdsString, setRawSelectedVendorIdsString] = React.useState<string>("");
  const [rawFinalItemsForCartString, setRawFinalItemsForCartString] = React.useState<string>("");
  const [rawMasterItemsListString, setRawMasterItemsListString] = React.useState<string>("[]");
  const [rawMaxDetourKm, setRawMaxDetourKm] = React.useState<string>("5");
  // Params for Step 2 rehydration
  const [rawSelectedGlobalItemsData, setRawSelectedGlobalItemsData] = React.useState<string>("{}");
  const [rawSelectedShopSpecificItemsData, setRawSelectedShopSpecificItemsData] = React.useState<string>("{}");
  const [rawSelectedGlobalItemsQuantities, setRawSelectedGlobalItemsQuantities] = React.useState<string>("{}");
  const [rawSelectedShopSpecificItemsQuantities, setRawSelectedShopSpecificItemsQuantities] = React.useState<string>("{}");


  React.useEffect(() => {
    const start = searchParams.get("start");
    const dest = searchParams.get("destination");
    const vendorIdsStr = searchParams.get("selectedVendorIds"); 
    const finalItemsStr = searchParams.get("finalItemsForCart"); 
    const subtotalFromStep3 = searchParams.get("cartSubtotal"); 
    const masterItemsStr = searchParams.get("masterItemsListString") || "[]";
    const detourStr = searchParams.get("maxDetourKm") || "5";

    // For Step 2 rehydration if going back far
    setRawSelectedGlobalItemsData(searchParams.get("selectedGlobalItemsData") || "{}");
    setRawSelectedShopSpecificItemsData(searchParams.get("selectedShopSpecificItemsData") || "{}");
    setRawSelectedGlobalItemsQuantities(searchParams.get("selectedGlobalItemsQuantities") || "{}");
    setRawSelectedShopSpecificItemsQuantities(searchParams.get("selectedShopSpecificItemsQuantities") || "{}");


    setRawSelectedVendorIdsString(vendorIdsStr || "");
    setRawFinalItemsForCartString(finalItemsStr || "");
    setRawMasterItemsListString(masterItemsStr);
    setRawMaxDetourKm(detourStr);


    if (!start || !dest || !vendorIdsStr || !finalItemsStr || !subtotalFromStep3) {
      setIsLoading(false);
      // Avoid showing error if it's just an empty cart state without parameters
      if (start || dest || vendorIdsStr || finalItemsStr || subtotalFromStep3) { 
        toast({ title: "Error", description: "Cart details are incomplete or invalid.", variant: "destructive" });
      }
      return;
    }
    
    setStartLocation(start);
    setDestination(dest);

    try {
      // finalItemsForCart is expected as: Record<string, Array<{itemId: string, quantity: number}>>
      const finalItemsByVendor: Record<string, Array<{itemId: string, quantity: number}>> = JSON.parse(finalItemsStr);
      const masterItemsList: Item[] = JSON.parse(masterItemsStr);
      const masterItemsMap = new Map(masterItemsList.map(item => [item.id, item]));

      // selectedVendorIds is a comma-separated string of vendor IDs
      const finalSelectedVendorIds: string[] = vendorIdsStr.split(',');

      let newOverallSubtotal = 0;
      const newCartVendorGroups: CartVendorGroup[] = [];

      finalSelectedVendorIds.forEach(vendorId => {
        // We need vendor info. Ideally, this would be part of finalItemsForCart or another param.
        // For now, let's try to get it from masterItemsList if items have vendorId, or make a generic one.
        // This part needs robust data from Step 3.
        let vendorInfo: Vendor = { id: vendorId, name: `Vendor ${vendorId.substring(0,6)}`, type: "Store", categories: [], address: "Address unavailable" };
        // If we passed a full vendor plan from step 3, we could get vendorInfo from there.
        // For now, we'll rely on items in masterItemsList potentially having vendorId to infer type.
        
        const itemsForThisVendor = finalItemsByVendor[vendorId] || [];
        const itemsToDisplay: CartVendorItem[] = [];
        let currentVendorSubtotal = 0;

        itemsForThisVendor.forEach(cartEntry => {
          const masterItem = masterItemsMap.get(cartEntry.itemId);
          if (masterItem) {
            const displayItem: CartVendorItem = {
              itemId: cartEntry.itemId,
              quantity: cartEntry.quantity,
              name: masterItem.name,
              price: masterItem.price,
              imageUrl: masterItem.imageUrl,
              dataAiHint: masterItem.dataAiHint,
              details: masterItem.details,
            };
            itemsToDisplay.push(displayItem);
            currentVendorSubtotal += (masterItem.price || 0) * cartEntry.quantity;
            
            // Attempt to refine vendorInfo type based on first item from this vendor
            if (vendorInfo.type === "Store" && masterItem.category) {
                if (masterItem.category === "takeout") vendorInfo.type = "Restaurant/Cafe";
                else if (masterItem.category === "grocery") vendorInfo.type = "Grocery Store";
                else if (masterItem.category === "medical") vendorInfo.type = "Pharmacy";
                // Add more mappings as needed
            }

          } else {
            console.warn(`Cart: Master item with ID ${cartEntry.itemId} not found for vendor ${vendorId}. Skipping.`);
          }
        });
        
        if (itemsToDisplay.length > 0) {
            newCartVendorGroups.push({ vendorInfo, items: itemsToDisplay, vendorSubtotal: currentVendorSubtotal });
            newOverallSubtotal += currentVendorSubtotal;
        }
      });
      
      setCartVendorGroups(newCartVendorGroups);
      const parsedSubtotal = parseFloat(subtotalFromStep3); // Use subtotal from Step 3 directly
      setOverallSubtotal(isNaN(parsedSubtotal) ? newOverallSubtotal : parsedSubtotal); // Fallback to re-calculated if parsing fails
      setIsLoading(false);

    } catch (error) {
      console.error("Error processing cart data:", error);
      toast({ title: "Error", description: "Could not load cart items. Check console.", variant: "destructive" });
      setIsLoading(false);
    }
  }, [searchParams, toast]);

  const handleProceedToCheckout = () => {
    if (cartVendorGroups.length === 0) {
        toast({ title: "Empty Cart", description: "Your cart is empty.", variant: "destructive" });
        return;
    }
    // Pass all necessary info to Step 5 (Payment)
    const params = new URLSearchParams({
      start: startLocation || "",
      destination: destination || "",
      selectedVendorIds: rawSelectedVendorIdsString, 
      finalItemsForCart: rawFinalItemsForCartString, 
      cartSubtotal: overallSubtotal.toFixed(2),
      masterItemsListString: rawMasterItemsListString, 
    });
    router.push(`/plan-trip/step-5?${params.toString()}`);
  };

  const handleRemoveItem = (vendorId: string, itemId: string) => {
    // This is a simplified removal. A real app would need to update underlying data more robustly.
    let itemRemovedPrice = 0;
    let itemRemovedQuantity = 0;

    const updatedCartVendorGroups = cartVendorGroups.map(group => {
      if (group.vendorInfo.id === vendorId) {
        const itemToRemove = group.items.find(item => item.itemId === itemId);
        if (itemToRemove) {
          itemRemovedPrice = itemToRemove.price || 0;
          itemRemovedQuantity = itemToRemove.quantity;
        }
        return {
          ...group,
          items: group.items.filter(item => item.itemId !== itemId),
          vendorSubtotal: group.vendorSubtotal - (itemRemovedPrice * itemRemovedQuantity)
        };
      }
      return group;
    }).filter(group => group.items.length > 0); // Remove vendor group if it becomes empty

    setCartVendorGroups(updatedCartVendorGroups);
    setOverallSubtotal(prevSubtotal => prevSubtotal - (itemRemovedPrice * itemRemovedQuantity));

    // Update rawFinalItemsForCartString (this is complex and error-prone, ideally managed by a state store)
    try {
      const parsedFinalItems: Record<string, Array<{itemId: string, quantity: number}>> = JSON.parse(rawFinalItemsForCartString);
      if (parsedFinalItems[vendorId]) {
        parsedFinalItems[vendorId] = parsedFinalItems[vendorId].filter(item => item.itemId !== itemId);
        if (parsedFinalItems[vendorId].length === 0) {
          delete parsedFinalItems[vendorId];
        }
        setRawFinalItemsForCartString(JSON.stringify(parsedFinalItems));

        // Update rawSelectedVendorIdsString if a vendor becomes empty
        if (Object.keys(parsedFinalItems).length === 0) {
            setRawSelectedVendorIdsString("");
        } else {
            setRawSelectedVendorIdsString(Object.keys(parsedFinalItems).join(','));
        }
      }
    } catch (e) { console.error("Error updating raw cart string on removal:", e); }


    toast({
      title: "Item Removed",
      description: `Item removed from ${vendorId}. Subtotal updated.`,
    });
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your cart...</p>
      </div>
    );
  }
  
  const handleBackToStep3 = () => {
    const params = new URLSearchParams();
    if (startLocation) params.set("start", startLocation);
    if (destination) params.set("destination", destination);
    params.set("maxDetourKm", rawMaxDetourKm);
    
    // Pass back original selections for Step 2 if user wants to go that far back
    params.set("selectedGlobalItemsData", rawSelectedGlobalItemsData);
    params.set("selectedShopSpecificItemsData", rawSelectedShopSpecificItemsData);
    params.set("selectedGlobalItemsQuantities", rawSelectedGlobalItemsQuantities);
    params.set("selectedShopSpecificItemsQuantities", rawSelectedShopSpecificItemsQuantities);
    
    router.push(`/plan-trip/step-3?${params.toString()}`);
  };


  return (
    <div className="flex min-h-screen flex-col bg-background">
        <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="mr-2 hover:bg-primary/80" 
                            onClick={handleBackToStep3}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-xl font-semibold">Step 4 of 5: My Cart</h1>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-primary/80" onClick={() => router.push('/home')}>
                    <Home className="h-6 w-6" />
                </Button>
            </div>
             <div className="flex justify-around">
                {[1,2,3,4,5].map((step) => (
                <Button key={step} variant="default" size="sm" className={cn("rounded-full w-10 h-10 p-0 flex items-center justify-center",
                    step === 4 ? "bg-foreground text-background hover:bg-foreground/90" : 
                    step <= 3 ? "bg-green-500 text-white hover:bg-green-600" : 
                    "bg-primary text-primary-foreground border border-primary-foreground hover:bg-primary/80")}>
                {step <= 3 ? <Check className="h-5 w-5" /> : step}
                </Button>))}
            </div>
        </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {startLocation && destination && (
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-sm">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">From:</span>&nbsp;
                <span className="text-muted-foreground truncate">{startLocation}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">To:</span>&nbsp;
                <span className="text-muted-foreground truncate">{destination}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {cartVendorGroups.length === 0 && !isLoading && (
            <div className="text-center py-10">
                <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground">Your cart is empty</p>
                <Button asChild className="mt-6"><Link href="/home">Start Shopping</Link></Button>
            </div>
        )}

        {cartVendorGroups.map(({ vendorInfo, items, vendorSubtotal }) => (
          <Card key={vendorInfo.id}>
            <CardHeader><CardTitle className="text-lg">{vendorInfo.name}</CardTitle><p className="text-xs text-muted-foreground">{vendorInfo.type}</p></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.itemId} className="flex items-start space-x-3 relative">
                    <Image src={item.imageUrl || "https://placehold.co/80x80.png"} alt={item.name || "Item"} width={64} height={64} className="rounded-md border bg-muted object-cover" data-ai-hint={item.dataAiHint || "product image"} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.name || "Item Name Missing"}</p>
                      {item.details && <p className="text-xs text-muted-foreground">{item.details}</p>}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">₹{(item.price || 0).toFixed(2)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7 absolute top-0 right-0" onClick={() => handleRemoveItem(vendorInfo.id, item.itemId)} aria-label="Remove item"><XCircle className="h-5 w-5" /></Button>
                  </li>))}
              </ul>
              <Separator className="my-3" />
              <div className="flex justify-end">
                <p className="text-sm font-medium">Subtotal for {vendorInfo.name.split(',')[0]}: <span className="font-semibold text-foreground">₹{vendorSubtotal.toFixed(2)}</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {cartVendorGroups.length > 0 && (
            <Card className="mt-6 shadow-md">
                <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
                <CardContent><div className="flex justify-between text-md font-semibold"><span>Total Item Price</span><span>₹{overallSubtotal.toFixed(2)}</span></div><p className="text-xs text-muted-foreground mt-1">Taxes and fees calculated at checkout.</p></CardContent>
            </Card>
        )}
      </main>

      {cartVendorGroups.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 border-t bg-background shadow-md z-20">
            <div className="flex justify-between items-center mb-3"><span className="text-lg font-semibold text-foreground">Subtotal:</span><span className="text-xl font-bold text-primary">₹{overallSubtotal.toFixed(2)}</span></div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" onClick={handleProceedToCheckout}>
              Confirm &amp; Pay ({cartVendorGroups.reduce((acc, cvg) => acc + cvg.items.reduce((itemSum, item) => itemSum + item.quantity, 0) , 0)} items)
            </Button>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading cart...</p>
        </div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
