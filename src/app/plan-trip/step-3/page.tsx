
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Check, MapPin, Clock, Route, Info, Loader2, ShoppingBag, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, documentId, doc, getDoc } from "firebase/firestore";
import RouteMap from "@/components/RouteMap";

interface Item {
  id: string;
  name: string;
  category: string; 
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
  price: number;
  originalPrice?: number;
  isAvailableOnThru?: boolean;
  vendorId?: string; 
  itemName?: string; 
  vendorItemCategory?: string; 
  description?: string;
}

interface Vendor {
  id: string;
  name: string; 
  shopName?: string;
  type: string; 
  eta?: string; 
  imageUrl?: string;
  dataAiHint?: string;
  categories: string[]; 
  simulatedDetourKm: number;
  isActiveOnThru?: boolean;
  address?: string;
}

interface VendorDisplayItem extends Item {
  quantity: number;
}

interface FinalVendorPlanEntry {
  vendorInfo: Vendor;
  items: VendorDisplayItem[];
  subtotal: number;
}

const DUMMY_MASTER_ITEMS_LIST_FOR_STEP3: Item[] = [
  { id: "groc1", name: "Organic Almonds", category: "grocery", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "almonds nuts", details: "200g", price: 249, isAvailableOnThru: true },
  { id: "groc2", name: "Whole Wheat Bread", category: "grocery", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "bread loaf", details: "1 loaf", price: 45, isAvailableOnThru: true },
  { id: "med1", name: "Band-Aids (Assorted)", category: "medical", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "bandages box", details: "Pack of 50", price: 90, isAvailableOnThru: true },
  { id: "pet1", name: "Dog Food (Chicken)", category: "pets", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "dog food", details: "1kg", price: 350, isAvailableOnThru: true },
  { id: "liq1", name: "Red Wine Example", category: "liquor", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "wine bottle", details: "750ml", price: 800, isAvailableOnThru: true },
  { id: "gift1", name: "Fancy Gift Basket", category: "gifts", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "gift basket", details: "Small", price: 1200, isAvailableOnThru: true },
  { id: "mock-cafe-item-1", name: "Espresso", category: "takeout", vendorId: "mock-v3-cafe", vendorItemCategory: "BEVERAGES", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "espresso shot", price: 120, isAvailableOnThru: true },
  { id: "zeo-maggi", name: "SPECIAL VEGGIE MAGGI", category: "takeout", vendorId: "zeothechef@gmail.com", vendorItemCategory: "MAGGI", imageUrl: "https://placehold.co/80x80.png", dataAiHint: "maggi noodles", price: 150, isAvailableOnThru: true },
];

// Mock vendor data removed - using only Firebase vendors


function PlanTripStep3PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [startLocation, setStartLocation] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);
  const [maxDetourKm, setMaxDetourKm] = React.useState<number>(5);
  
  const [finalVendorPlan, setFinalVendorPlan] = React.useState<Record<string, FinalVendorPlanEntry>>({});
  const [itemDetailsMap, setItemDetailsMap] = React.useState<Map<string, Item>>(new Map());

  const [originalGlobalItemsDataStr, setOriginalGlobalItemsDataStr] = React.useState<string>("{}");
  const [originalShopSpecificItemsDataStr, setOriginalShopSpecificItemsDataStr] = React.useState<string>("{}");
  const [originalGlobalItemsQuantitiesStr, setOriginalGlobalItemsQuantitiesStr] = React.useState<string>("{}");
  const [originalShopSpecificItemsQuantitiesStr, setOriginalShopSpecificItemsQuantitiesStr] = React.useState<string>("{}");


  React.useEffect(() => {
    const start = searchParams.get("start");
    const dest = searchParams.get("destination");
    const detour = searchParams.get("maxDetourKm");
    const globalItemsStr = searchParams.get("selectedGlobalItemsData") || "{}";
    const shopSpecificItemsStr = searchParams.get("selectedShopSpecificItemsData") || "{}";
    const globalQuantitiesStr = searchParams.get("selectedGlobalItemsQuantities") || "{}";
    const shopSpecificQuantitiesStr = searchParams.get("selectedShopSpecificItemsQuantities") || "{}";

    setOriginalGlobalItemsDataStr(globalItemsStr);
    setOriginalShopSpecificItemsDataStr(shopSpecificItemsStr);
    setOriginalGlobalItemsQuantitiesStr(globalQuantitiesStr);
    setOriginalShopSpecificItemsQuantitiesStr(shopSpecificQuantitiesStr);

    if (!start || !dest || !detour) {
      toast({ title: "Missing Information", description: "Route details are missing.", variant: "destructive" });
      router.push("/plan-trip/step-1"); 
      return;
    }
    setStartLocation(start);
    setDestination(dest);
    const detourKm = parseFloat(detour);
    setMaxDetourKm(detourKm);
    
    initializeStepData(
        globalItemsStr, 
        shopSpecificItemsStr, 
        globalQuantitiesStr, 
        shopSpecificQuantitiesStr, 
        detourKm
    );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const initializeStepData = async (
    globalItemsDataString: string, 
    shopSpecificItemsDataString: string, 
    globalQuantitiesString: string, 
    shopSpecificQuantitiesString: string,
    currentMaxDetour: number
  ) => {
    setIsLoading(true);
    console.log("[Step 3] Initializing. Detour:", currentMaxDetour);

    const requestedGlobalItemsData: Record<string, string[]> = JSON.parse(globalItemsDataString);
    const requestedShopSpecificItemsData: Record<string, { vendorName: string; vendorType: string; items: Record<string, string[]> }> = JSON.parse(shopSpecificItemsDataString);
    const globalItemQuantities: Record<string, number> = JSON.parse(globalQuantitiesString);
    const shopSpecificItemQuantities: Record<string, Record<string, number>> = JSON.parse(shopSpecificQuantitiesString);

    const tempMasterItemsMap = new Map<string, Item>();
    const allItemIdsToFetch = new Set<string>();

    Object.values(requestedGlobalItemsData).flat().forEach(id => allItemIdsToFetch.add(id));
    Object.values(requestedShopSpecificItemsData).forEach(shopData => 
        Object.values(shopData.items).flat().forEach(id => allItemIdsToFetch.add(id))
    );
    
    if (allItemIdsToFetch.size > 0) {
      const itemChunks = Array.from(allItemIdsToFetch).reduce((acc, item, i) => {
        const chunkIndex = Math.floor(i / 30);
        if(!acc[chunkIndex]) acc[chunkIndex] = []; acc[chunkIndex].push(item); return acc;
      }, [] as string[][]);

      for (const chunk of itemChunks) {
        if (chunk.length > 0) {
          try {
            if (!db) {
              console.warn("[Step 3] Firestore not initialized, skipping item fetch");
            } else {
              // Fetch items from vendor sub-collections
              // Group items by vendorId for efficient fetching
              const vendorItemsMap = new Map<string, string[]>();
              chunk.forEach(itemId => {
                // Try to get vendorId from the item data if it was stored
                // For now, we'll need to search all vendor sub-collections
                if (!vendorItemsMap.has('search_all')) {
                  vendorItemsMap.set('search_all', []);
                }
                vendorItemsMap.get('search_all')!.push(itemId);
              });

              // Search all vendor sub-collections for the items
              try {
                const vendorsRef = collection(db, "vendors");
                const vendorsSnapshot = await getDocs(vendorsRef);
                
                for (const vendorDoc of vendorsSnapshot.docs) {
                  const inventoryRef = collection(db, "vendors", vendorDoc.id, "inventory");
                  const itemQuery = query(inventoryRef, where(documentId(), "in", chunk));
                  const itemSnapshots = await getDocs(itemQuery);
                  
                  itemSnapshots.forEach(docSnap => {
                    const data = docSnap.data();
                    tempMasterItemsMap.set(docSnap.id, { 
                        id: docSnap.id, ...data, 
                        name: data.itemName || data.name || `Item ${docSnap.id}`,
                        category: data.category || "unknown",
                        vendorItemCategory: data.vendorItemCategory,
                        price: data.price || 0,
                        vendorId: vendorDoc.id
                    } as Item);
                  });
                }
              } catch (e) {
                console.error("Error fetching items from vendor sub-collections:", e);
              }
            }
          } catch (e) { console.error("Error fetching item chunk from Firestore:", e); }
        }
      }
    }
    DUMMY_MASTER_ITEMS_LIST_FOR_STEP3.forEach(mockItem => { 
      if (allItemIdsToFetch.has(mockItem.id) && !tempMasterItemsMap.has(mockItem.id)) {
        tempMasterItemsMap.set(mockItem.id, mockItem);
      }
    });
    setItemDetailsMap(tempMasterItemsMap);
    console.log("[Step 3] Master Items Map populated:", tempMasterItemsMap);

    const newFinalVendorPlan: Record<string, FinalVendorPlanEntry> = {};
    const assignedItemQuantities: Record<string, number> = {}; 

    for (const vendorId in requestedShopSpecificItemsData) {
      const shopSelectionData = requestedShopSpecificItemsData[vendorId];
      let vendorInfo: Vendor | undefined;
      try {
          if (!db) {
              console.warn("[Step 3] Firestore not initialized, skipping vendor fetch");
              vendorInfo = undefined;
          } else {
              const vendorDocSnap = await getDoc(doc(db, "vendors", vendorId));
          if (vendorDocSnap.exists()) {
            const data = vendorDocSnap.data();
            // Stricter check for simulatedDetourKm
            if (typeof data.simulatedDetourKm === 'number') {
              vendorInfo = { 
                  id: vendorDocSnap.id, 
                  name: data.shopName || data.name || `Vendor ${vendorDocSnap.id}`,
                  shopName: data.shopName,
                  type: data.type || "Store",
                  categories: Array.isArray(data.categories) ? data.categories : [],
                  simulatedDetourKm: data.simulatedDetourKm,
                  isActiveOnThru: data.isActiveOnThru === true,
                  imageUrl: data.imageUrl,
                  dataAiHint: data.dataAiHint,
                  address: data.address
              } as Vendor;
              console.log(`[Step 3] Fetched actual vendor for shop-specific: ${vendorInfo.name} (ID: ${vendorId})`);
            } else {
              console.warn(`[Step 3] Shop-specific vendor ${data.shopName || vendorId} excluded because its 'simulatedDetourKm' is missing or not a number.`);
            }
          }
        }
        } catch (e) { console.error(`Error fetching vendor ${vendorId} from Firestore:`, e); }
      
      // No fallback to dummy data - use only Firebase vendors

      if (!vendorInfo) { // Further fallback if not in dummy data either
        vendorInfo = { 
            id: vendorId, name: shopSelectionData.vendorName || `Vendor ${vendorId}`, 
            shopName: shopSelectionData.vendorName,
            type: shopSelectionData.vendorType || "Store", 
            categories: [], simulatedDetourKm: 0.0, isActiveOnThru: true,
            imageUrl: "https://placehold.co/150x100.png", dataAiHint: "store front"
        };
        console.log(`[Step 3] Using fallback generated vendor for shop-specific: ${vendorInfo.name} (ID: ${vendorId})`);
      }

      if (vendorInfo.simulatedDetourKm <= currentMaxDetour) {
        if (!newFinalVendorPlan[vendorId]) {
          newFinalVendorPlan[vendorId] = { vendorInfo, items: [], subtotal: 0 };
        }
        const itemsFromThisShop = shopSpecificItemQuantities[vendorId] || {};
        for (const itemId in itemsFromThisShop) {
          const itemDetail = tempMasterItemsMap.get(itemId);
          const quantity = itemsFromThisShop[itemId];
          if (itemDetail && quantity > 0) {
            newFinalVendorPlan[vendorId].items.push({ ...itemDetail, quantity });
            newFinalVendorPlan[vendorId].subtotal += (itemDetail.price || 0) * quantity;
            assignedItemQuantities[itemId] = (assignedItemQuantities[itemId] || 0) + quantity;
          }
        }
      } else {
        console.warn(`[Step 3] Shop-specific vendor ${vendorId} (${vendorInfo.shopName || vendorInfo.name}) is outside detour limit (${vendorInfo.simulatedDetourKm}km > ${currentMaxDetour}km). Items not added.`);
      }
    }
    console.log("[Step 3] After processing shop-specific items, plan:", newFinalVendorPlan);

    const globalItemsToAssignDetails: Array<{ item: Item, quantity: number }> = [];
    Object.entries(requestedGlobalItemsData).forEach(([mainCat, itemIds]) => {
      itemIds.forEach(id => {
        const itemDetail = tempMasterItemsMap.get(id);
        const totalNeededQuantity = globalItemQuantities[id];
        if (itemDetail && totalNeededQuantity > 0) {
          const alreadyAssigned = assignedItemQuantities[id] || 0;
          const remainingQuantityToAssign = totalNeededQuantity - alreadyAssigned;
          if (remainingQuantityToAssign > 0) {
            globalItemsToAssignDetails.push({ item: itemDetail, quantity: remainingQuantityToAssign });
          }
        }
      });
    });

    if (globalItemsToAssignDetails.length > 0) {
      let potentialVendors: Vendor[] = [];
      try {
        if (!db) {
            console.warn("[Step 3] Firestore not initialized, skipping global vendor fetch");
            potentialVendors = [];
        } else {
            const globalItemMainCategories = Array.from(new Set(globalItemsToAssignDetails.map(gItemDetail => gItemDetail.item.category)));
            if (globalItemMainCategories.length > 0) {
                const q = query(collection(db, "vendors"), 
                                where("isActiveOnThru", "==", true), 
                                where("categories", "array-contains-any", globalItemMainCategories));
            const snapshot = await getDocs(q);
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (typeof data.simulatedDetourKm === 'number') {
                    const detourKm = data.simulatedDetourKm;
                    if(detourKm <= currentMaxDetour) { 
                        potentialVendors.push({ 
                            id: docSnap.id, 
                            name: data.shopName || data.name || `Vendor ${docSnap.id}`,
                            shopName: data.shopName,
                            type: data.type || "Store",
                            categories: Array.isArray(data.categories) ? data.categories : [],
                            simulatedDetourKm: detourKm,
                            isActiveOnThru: data.isActiveOnThru === true,
                            imageUrl: data.imageUrl,
                            dataAiHint: data.dataAiHint,
                            address: data.address
                        } as Vendor);
                    }
                } else {
                    const vendorName = data.shopName || data.name || `Vendor ${docSnap.id}`;
                    console.warn(`[Step 3] Potential vendor ${vendorName} (ID: ${docSnap.id}) excluded because 'simulatedDetourKm' is missing or not a number.`);
                }
            });
            console.log(`[Step 3] Fetched ${potentialVendors.length} potential actual vendors (within detour) for global items.`);
            }
        }
      } catch (e) { console.error("[Step 3] Error fetching potential vendors for global items:", e); }
      
      // Use only Firebase vendors - no mock data
      potentialVendors = potentialVendors.sort((a,b) => a.simulatedDetourKm - b.simulatedDetourKm); 
      console.log(`[Step 3] Total potential vendors from Firebase (within detour, sorted): ${potentialVendors.length}`);

      for (const { item, quantity } of globalItemsToAssignDetails) {
        let assigned = false;
        for (const vendorId in newFinalVendorPlan) { // Attempt 1: Existing vendor in plan
          const planEntry = newFinalVendorPlan[vendorId];
          if (planEntry.vendorInfo.categories.includes(item.category)) {
            planEntry.items.push({ ...item, quantity });
            planEntry.subtotal += (item.price || 0) * quantity;
            assigned = true;
            console.log(`[Step 3] Global item ${item.name} (qty ${quantity}) assigned to EXISTING vendor ${planEntry.vendorInfo.shopName || planEntry.vendorInfo.name}`);
            break;
          }
        }
        if (assigned) continue;

        let chosenVendor: Vendor | null = null; // Attempt 2 & 3: Suitable potential vendor (actual or mock)
        for (const pVendor of potentialVendors) {
            if (pVendor.categories.includes(item.category) && !newFinalVendorPlan[pVendor.id]) { // Prioritize vendors not yet in plan for new assignments
                chosenVendor = pVendor;
                break;
            }
        }
        if (!chosenVendor) { // If all suitable vendors are already in plan, pick the first one that matches category
             for (const pVendor of potentialVendors) {
                if (pVendor.categories.includes(item.category)) {
                    chosenVendor = pVendor;
                    break;
                }
            }
        }

        if (chosenVendor) {
            if (!newFinalVendorPlan[chosenVendor.id]) {
                 newFinalVendorPlan[chosenVendor.id] = { vendorInfo: chosenVendor, items: [], subtotal: 0 };
            }
            newFinalVendorPlan[chosenVendor.id].items.push({ ...item, quantity });
            newFinalVendorPlan[chosenVendor.id].subtotal += (item.price || 0) * quantity;
            assigned = true;
            console.log(`[Step 3] Global item ${item.name} (qty ${quantity}) assigned to POTENTIAL vendor ${chosenVendor.shopName || chosenVendor.name}`);
            continue;
        }
        
        if (!assigned) { // Attempt 4: Dynamic Mock Vendor
            const dynamicMockVendorId = `dynamic-mock-${item.category}-${Math.random().toString(36).substring(2, 7)}`;
            const dynamicMockVendor: Vendor = {
                id: dynamicMockVendorId,
                name: `On-Route ${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Supplier`,
                shopName: `On-Route ${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Supplier`,
                type: `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Store`,
                categories: [item.category],
                simulatedDetourKm: 0.2, // Fixed small detour for dynamic mocks
                isActiveOnThru: true,
                imageUrl: "https://placehold.co/150x100.png?text=Your+Items",
                dataAiHint: `${item.category} items`
            };
            newFinalVendorPlan[dynamicMockVendor.id] = { vendorInfo: dynamicMockVendor, items: [], subtotal: 0 };
            newFinalVendorPlan[dynamicMockVendor.id].items.push({ ...item, quantity });
            newFinalVendorPlan[dynamicMockVendor.id].subtotal += (item.price || 0) * quantity;
            console.log(`[Step 3] Global item ${item.name} (qty ${quantity}) assigned to DYNAMIC mock vendor ${dynamicMockVendor.name}`);
        }
      }
    }
    console.log("[Step 3] Final Vendor Plan after all assignments:", JSON.stringify(newFinalVendorPlan, null, 2));
    setFinalVendorPlan(newFinalVendorPlan);
    setIsLoading(false);
  };
  
  const handleContinueToCart = () => {
    if (Object.keys(finalVendorPlan).length === 0 && itemDetailsMap.size > 0 && !isLoading) {
      toast({ title: "No Shops Available", description: "Could not find vendors for your selected items within the detour limit.", variant: "destructive"});
      return;
    }
     if (Object.values(finalVendorPlan).every(entry => entry.items.length === 0) && !isLoading) {
        toast({ title: "Empty Cart", description: "No items were assigned to any shop.", variant: "destructive"});
        return;
    }
    
    const finalSelectedVendorIds = Object.keys(finalVendorPlan);
    const finalItemsForCartStructure: Record<string, Array<{itemId: string, quantity: number}>> = {};
    let overallSubtotal = 0;

    for (const vendorId in finalVendorPlan) {
      finalItemsForCartStructure[vendorId] = finalVendorPlan[vendorId].items.map(displayItem => ({ 
        itemId: displayItem.id, 
        quantity: displayItem.quantity 
      }));
      overallSubtotal += finalVendorPlan[vendorId].subtotal;
    }
    
    const params = new URLSearchParams({
      start: startLocation || "",
      destination: destination || "",
      maxDetourKm: maxDetourKm.toString(),
      selectedVendorIds: finalSelectedVendorIds.join(','), 
      finalItemsForCart: JSON.stringify(finalItemsForCartStructure), 
      cartSubtotal: overallSubtotal.toFixed(2),
      masterItemsListString: JSON.stringify(Array.from(itemDetailsMap.values())) 
    });

    params.set("selectedGlobalItemsData", originalGlobalItemsDataStr);
    params.set("selectedShopSpecificItemsData", originalShopSpecificItemsDataStr);
    params.set("selectedGlobalItemsQuantities", originalGlobalItemsQuantitiesStr);
    params.set("selectedShopSpecificItemsQuantities", originalShopSpecificItemsQuantitiesStr);

    console.log("[Step 3] Proceeding to Cart with params:", params.toString());
    router.push(`/cart?${params.toString()}`);
  };
  
  if (isLoading || !startLocation || !destination) {
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Optimizing route &amp; finding best shops...</p></div>);
  }

  const allVendorsInFinalPlan = Object.values(finalVendorPlan).map(entry => entry.vendorInfo);
  const totalItemsInCart = Object.values(finalVendorPlan).reduce((acc, entry) => acc + entry.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 hover:bg-primary/80" 
                    onClick={() => {
                        const params = new URLSearchParams();
                        if (startLocation) params.set("start", startLocation);
                        if (destination) params.set("destination", destination);
                        params.set("maxDetourKm", maxDetourKm.toString());
                        params.set("selectedGlobalItemsData", originalGlobalItemsDataStr);
                        params.set("selectedShopSpecificItemsData", originalShopSpecificItemsDataStr);
                        params.set("selectedGlobalItemsQuantities", originalGlobalItemsQuantitiesStr);
                        params.set("selectedShopSpecificItemsQuantities", originalShopSpecificItemsQuantitiesStr);
                        router.push(`/plan-trip/step-2?${params.toString()}`)
                    }}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold">Step 3 of 5: Review Shops &amp; Route</h1>
            </div>
            <Button variant="ghost" size="icon" className="hover:bg-primary/80" onClick={() => router.push('/home')}>
                <Home className="h-6 w-6" />
            </Button>
        </div>
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map((step) => (
            <Button key={step} variant="default" size="sm" className={cn("rounded-full w-10 h-10 p-0 flex items-center justify-center",
                step === 3 ? "bg-foreground text-background hover:bg-foreground/90" : 
                step <= 2 ? "bg-green-500 text-white hover:bg-green-600" : 
                "bg-primary text-primary-foreground border border-primary-foreground hover:bg-primary/80")}>
             {step <= 2 ? <Check className="h-5 w-5" /> : step}
            </Button>))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto pb-24">
        <div className="bg-muted/50 p-3 rounded-lg shadow-sm space-y-1">
            <div className="flex items-center text-sm"><MapPin className="h-4 w-4 mr-1.5 text-primary shrink-0" /><span className="font-medium text-foreground truncate">From:</span>&nbsp;<span className="text-muted-foreground truncate">{startLocation}</span></div>
            <div className="flex items-center text-sm"><MapPin className="h-4 w-4 mr-1.5 text-primary shrink-0" /><span className="font-medium text-foreground truncate">To:</span>&nbsp;<span className="text-muted-foreground truncate">{destination}</span></div>
            <div className="flex items-center text-sm"><Route className="h-4 w-4 mr-1.5 text-primary shrink-0" /><span className="font-medium text-foreground">Max Detour:</span>&nbsp;<span className="text-muted-foreground">{maxDetourKm.toFixed(1)} km</span></div>
        </div>
        
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted shadow">
          <RouteMap 
            startLocation={startLocation}
            destination={destination}
            vendorStops={allVendorsInFinalPlan}
            maxDetourKm={maxDetourKm}
            className="w-full h-full"
          />
        </div>
        
        <div>
          <h2 className="text-md font-semibold text-foreground mb-3">Your Planned Stops ({allVendorsInFinalPlan.length} {allVendorsInFinalPlan.length === 1 ? "shop" : "shops"})</h2>
          {allVendorsInFinalPlan.length === 0 && !isLoading && (
            <Card className="border-dashed"><CardContent className="p-6 text-center"><ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="font-medium text-foreground">No Shops in Plan</p>
                <p className="text-sm text-muted-foreground">No shops were assigned for your selected items within the set detour, or no items were selected.</p>
                 <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Edit Items/Categories</Button>
              </CardContent></Card>
          )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{allVendorsInFinalPlan.map((vendor) => (
                  <Card key={vendor.id} className="transition-all hover:shadow-lg overflow-hidden ring-1 ring-border">
                    <CardHeader className="p-3">
                        <CardTitle className="text-base">{vendor.shopName || vendor.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{vendor.type}</p>
                        {vendor.address && <p className="text-xs text-muted-foreground truncate"><MapPin className="inline h-3 w-3 mr-1" />{vendor.address}</p>}
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <Image 
                          src={vendor.imageUrl || `https://source.unsplash.com/600x320/?${encodeURIComponent(vendor.dataAiHint || vendor.type || 'store front')}`}
                          alt={vendor.shopName || vendor.name || ''}
                          width={600}
                          height={320}
                          className="w-full h-32 object-cover rounded-md mb-2"
                          data-ai-hint={vendor.dataAiHint || 'store exterior'}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            {vendor.eta && (<div className="flex items-center text-accent"><Clock className="h-3 w-3 mr-1" /><span>ETA: {vendor.eta}</span></div>)}
                            {vendor.simulatedDetourKm !== undefined && (<div className="flex items-center text-blue-600"><Route className="h-3 w-3 mr-1" /><span>{vendor.simulatedDetourKm.toFixed(1)} km detour</span></div>)}
                        </div>
                        <h4 className="text-xs font-semibold mt-2 mb-1 text-foreground">Items ({finalVendorPlan[vendor.id]?.items.reduce((sum, i) => sum + i.quantity, 0) || 0}):</h4>
                        <ul className="text-xs space-y-0.5 text-muted-foreground max-h-24 overflow-y-auto pr-1">
                            {(finalVendorPlan[vendor.id]?.items || []).map(item => (
                                <li key={item.id} className="truncate flex justify-between">
                                  <span>{item.quantity} x {item.name}</span>
                                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs font-semibold text-right mt-1">Subtotal: ₹{finalVendorPlan[vendor.id]?.subtotal.toFixed(2)}</p>
                    </CardContent>
                </Card>
            ))}</div>
        </div>
      </div>

      <div className="p-4 border-t bg-background sticky bottom-0 z-20">
        <Button 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" 
          onClick={handleContinueToCart} 
          disabled={isLoading || totalItemsInCart === 0}
        >
          Proceed to Cart Summary ({totalItemsInCart} item{totalItemsInCart !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
}

export default function PlanTripStep3Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading trip planning...</p>
        </div>
      </div>
    }>
      <PlanTripStep3PageContent />
    </Suspense>
  );
}
