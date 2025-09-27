
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  Check, 
  Search, 
  X, 
  Store,
  Loader2, 
  PlusCircle, 
  MinusCircle,
  Gift,
  PawPrint,
  Wine,
  BriefcaseMedical,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/layout/bottom-nav";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { groceryFirestore, GroceryProduct } from "@/lib/grocery-firestore";
import ShoppingCartEnhanced from "@/components/ShoppingCartEnhanced";

interface Item {
  id: string;
  name: string;
  category: string; 
  imageUrl: string;
  dataAiHint: string;
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
  coordinates?: {
    lat: number;
    lng: number;
  };
  realDetourKm?: number;
  detourDuration?: string;
}

// All mock data removed - using only Firebase data


interface MainCategoryConfig {
  id: string; 
  name: string; 
  icon: React.ElementType;
  type: "item-first" | "shop-first"; 
  filterKeywords?: string[]; 
}

const MAIN_CATEGORIES_CONFIG: MainCategoryConfig[] = [
  { id: "grocery", name: "Groceries", icon: Store, type: "item-first" },
  { id: "medical", name: "Medical", icon: BriefcaseMedical, type: "item-first" },
  { id: "takeout", name: "Takeout Food", icon: Store, type: "shop-first" },
  { id: "gifts", name: "Gifts", icon: Gift, type: "shop-first", filterKeywords: ["gift shop"] },
  { id: "pets", name: "Pet Supplies", icon: PawPrint, type: "item-first" },
  { id: "liquor", name: "Liquor", icon: Wine, type: "shop-first", filterKeywords: ["liquor store"] },
];

type ViewMode = "category-selection" | "item-list" | "shop-list" | "shop-item-list";
type SelectedGlobalItemsMap = Record<string, number>; 
type SelectedShopSpecificItemsMap = Record<string, Record<string, number>>;


function PlanTripStep2PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [startLocation, setStartLocation] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);
  const [maxDetourKm, setMaxDetourKm] = React.useState<number>(5);
  const [preferSingleStore, setPreferSingleStore] = React.useState(true);

  const [viewMode, setViewMode] = React.useState<ViewMode>("category-selection");
  const [activeMainCategory, setActiveMainCategory] = React.useState<MainCategoryConfig | null>(null);
  const [currentSelectedShop, setCurrentSelectedShop] = React.useState<Vendor | null>(null);
  
  const [availableItems, setAvailableItems] = React.useState<Item[]>([]);
  const [availableShops, setAvailableShops] = React.useState<Vendor[]>([]);

  const [selectedGlobalItems, setSelectedGlobalItems] = React.useState<SelectedGlobalItemsMap>({});
  const [selectedShopSpecificItems, setSelectedShopSpecificItems] = React.useState<SelectedShopSpecificItemsMap>({});
  
  const [isLoadingItems, setIsLoadingItems] = React.useState(false);
  const [isLoadingShops, setIsLoadingShops] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  const [currentShopSearchQuery, setCurrentShopSearchQuery] = React.useState("");
  const [currentItemSearchQuery, setCurrentItemSearchQuery] = React.useState("");

  const [allItemsMap, setAllItemsMap] = React.useState<Map<string, Item>>(new Map());
  
  // State for main checklist destination and departure time
  const [userDestination, setUserDestination] = React.useState<string>("");
  const [departureTime, setDepartureTime] = React.useState<string>("");

  // Enhanced filtering for grocery items with API search
  const [grocerySearchResults, setGrocerySearchResults] = React.useState<Item[]>([]);
  const [isSearchingGrocery, setIsSearchingGrocery] = React.useState(false);

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    // For grocery items with search query, use real-time search results
    if (activeMainCategory?.id === "grocery" && currentItemSearchQuery.trim()) {
      return grocerySearchResults;
    }
    
    // For other cases, filter available items
    if (!currentItemSearchQuery.trim()) {
      return availableItems;
    }
    
    const searchTerm = currentItemSearchQuery.toLowerCase();
    return availableItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      item.dataAiHint.toLowerCase().includes(searchTerm) ||
      (item.description && item.description.toLowerCase().includes(searchTerm)) ||
      (item.details && item.details.toLowerCase().includes(searchTerm))
    );
  }, [availableItems, currentItemSearchQuery, activeMainCategory?.id, grocerySearchResults]);

  // Filter shops based on search query
  const filteredShops = React.useMemo(() => {
    if (!currentShopSearchQuery.trim()) {
      return availableShops;
    }
    
    const searchTerm = currentShopSearchQuery.toLowerCase();
    return availableShops.filter(shop => 
      (shop.shopName || shop.name).toLowerCase().includes(searchTerm) ||
      shop.type.toLowerCase().includes(searchTerm) ||
      (shop.address && shop.address.toLowerCase().includes(searchTerm)) ||
      (shop.dataAiHint && shop.dataAiHint.toLowerCase().includes(searchTerm))
    );
  }, [availableShops, currentShopSearchQuery]);

  // Set default departure time to 10 minutes from now
  React.useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const timeString = now.toTimeString().slice(0, 5); // HH:MM format
    setDepartureTime(timeString);
  }, []);

  // Set destination from step 1 when it's available
  React.useEffect(() => {
    if (destination && !userDestination) {
      setUserDestination(destination);
    }
  }, [destination, userDestination]);

  // Function to calculate real detour distance using Google Maps Directions API
  const calculateRealDetour = async (
    startLocation: string, 
    destination: string, 
    vendorCoordinates: { lat: number; lng: number }
  ): Promise<{ distance: number; duration: string } | null> => {
    try {
      if (!window.google || !window.google.maps) {
        console.warn("[Step 2 Hub] Google Maps API not loaded, using fallback detour calculation");
        return null;
      }

      const directionsService = new window.google.maps.DirectionsService();
      
      // Create waypoint for the vendor location
      const waypoint = {
        location: new window.google.maps.LatLng(vendorCoordinates.lat, vendorCoordinates.lng),
        stopover: true
      };

      const request = {
        origin: startLocation,
        destination: destination,
        waypoints: [waypoint],
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false // Keep vendor as waypoint
      };

      return new Promise((resolve) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            const leg = route.legs[0]; // First leg (start to vendor)
            
            // Calculate detour: (start -> vendor -> destination) - (start -> destination)
            const directDistance = route.legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0);
            const detourDistance = directDistance - (route.legs[0].distance?.value || 0); // Subtract direct distance
            
            const detourKm = Math.round((detourDistance / 1000) * 10) / 10; // Convert to km, round to 1 decimal
            const detourDuration = route.legs[0].duration?.text || "Unknown";
            
            console.log(`[Step 2 Hub] Calculated detour: ${detourKm}km, Duration: ${detourDuration}`);
            resolve({ distance: detourKm, duration: detourDuration });
          } else {
            console.warn(`[Step 2 Hub] Directions API error: ${status}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error("[Step 2 Hub] Error calculating detour:", error);
      return null;
    }
  };

  // Cache for vendors to avoid repeated Firebase calls
  const [vendorsCache, setVendorsCache] = React.useState<Map<string, Vendor[]>>(new Map());


  React.useEffect(() => {
    console.log("[Step 2 Hub] Component Mounted or searchParams changed.");
    const start = searchParams.get("start");
    const dest = searchParams.get("destination");
    const detour = searchParams.get("maxDetourKm");

    const globalItemsQuantitiesStr = searchParams.get("selectedGlobalItemsQuantities");
    const shopSpecificItemsQuantitiesStr = searchParams.get("selectedShopSpecificItemsQuantities");

    if (start && dest && detour) {
      setStartLocation(start);
      setDestination(dest);
      setMaxDetourKm(parseFloat(detour));
      console.log(`[Step 2 Hub] Route: From - ${start}, To - ${dest}, Max Detour - ${detour}km`);

      if (globalItemsQuantitiesStr) {
        try { setSelectedGlobalItems(JSON.parse(globalItemsQuantitiesStr)); }
        catch (e) { console.error("Error parsing selectedGlobalItemsQuantities:", e); }
      }
      if (shopSpecificItemsQuantitiesStr) {
        try { setSelectedShopSpecificItems(JSON.parse(shopSpecificItemsQuantitiesStr)); }
        catch (e) { console.error("Error parsing selectedShopSpecificItemsQuantities:", e); }
      }

    } else {
      toast({ title: "Missing Route Info", description: "Route or detour preference is missing.", variant: "destructive" });
      router.push("/plan-trip/step-1");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  React.useEffect(() => {
    console.log(`[Step 2 Hub] ViewMode changed to: ${viewMode}. Active Category: ${activeMainCategory?.name || 'None'}. Selected Shop: ${currentSelectedShop?.name || 'None'}`);
    if (viewMode === "item-list" && activeMainCategory && activeMainCategory.type === "item-first") {
      fetchRelevantItems(activeMainCategory.id);
    } else if (viewMode === "shop-item-list" && currentSelectedShop) {
      fetchItemsForShop(currentSelectedShop.id);
    } else if (viewMode === "shop-list" && activeMainCategory && activeMainCategory.type === "shop-first") {
      fetchRelevantShops(activeMainCategory, maxDetourKm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeMainCategory, currentSelectedShop, maxDetourKm]);


  const fetchRelevantItems = async (categoryId: string) => {
    console.log(`[Step 2 Hub] fetchRelevantItems for category: ${categoryId}`);
    setIsLoadingItems(true);
    setAvailableItems([]);
    let fetchedItems: Item[] = [];
    
    try {
      // Handle grocery items using the grocery API
      if (categoryId === "grocery") {
        console.log(`[Step 2 Hub] Fetching grocery items from grocery API...`);
        // Try multiple search terms to get popular grocery items
        const searchTerms = ["onion", "milk", "bread", "rice", "oil", "sugar", "salt", "tomato", "potato", "apple", "banana", "carrot", "chicken", "fish", "eggs", "cheese", "yogurt", "butter", "flour", "pasta"];
        let allProducts: GroceryProduct[] = [];
        
        for (const term of searchTerms) {
          try {
            const products = await groceryFirestore.searchProducts(term, 10); // Use Firestore service
            allProducts = [...allProducts, ...products];
          } catch (error) {
            console.warn(`[Step 2 Hub] Error searching for ${term}:`, error);
          }
        }
        
        // Remove duplicates based on product ID
        const uniqueProducts = allProducts.filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        );
        
        console.log(`[Step 2 Hub] Grocery API returned ${uniqueProducts.length} unique products`);
        
        fetchedItems = uniqueProducts.map((product: GroceryProduct) => ({
          id: product.id,
          name: product.display_name,
          category: product.category || "grocery",
          imageUrl: product.image_url || "https://placehold.co/80x80.png",
          dataAiHint: product.product_name.toLowerCase(),
          details: `${product.pack_value} ${product.pack_unit}`,
          price: product.price,
          originalPrice: product.price,
          isAvailableOnThru: true,
          vendorId: "",
          itemName: product.display_name,
          vendorItemCategory: product.category || "grocery",
          description: product.description || `${product.pack_value} ${product.pack_unit}`
        } as Item));
        
        console.log(`[Step 2 Hub] Converted ${fetchedItems.length} grocery products to items`);
      } else {
        // Handle other categories using Firestore
        if (!db) {
          console.warn("[Step 2 Hub] Firestore not initialized, skipping items fetch");
        } else {
          const q = query(collection(db, "vendor_inventory"), 
                          where("category", "==", categoryId), 
                          where("isAvailableOnThru", "==", true),
                          where("vendorId", "==", "") 
                        ); 
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            fetchedItems.push({ id: doc.id, ...doc.data(), name: doc.data().itemName || `Item ${doc.id}`, category: doc.data().category || "unknown", price: doc.data().price || 0 } as Item);
          });
          console.log(`[Step 2 Hub] Firestore fetched ${fetchedItems.length} generic items for ${categoryId}.`);
        }
      }
    } catch (error) {
      console.error(`[Step 2 Hub] Error fetching items for ${categoryId}:`, error);
    }

    setAvailableItems(fetchedItems);
    updateAllItemsMap(fetchedItems);
    setIsLoadingItems(false);
  };

  const fetchRelevantShops = async (categoryConfig: MainCategoryConfig, currentMaxDetour: number) => {
    const shopTypes = categoryConfig.filterKeywords || [];
    const cacheKey = shopTypes.length > 0 ? shopTypes.join(',') : 'all';
    
    console.log(`[Step 2 Hub] fetchRelevantShops for category '${categoryConfig.name}' (types: ${shopTypes.join(', ')}) with maxDetour: ${currentMaxDetour}km`);
    
    // Handle grocery shops using the grocery API
    if (categoryConfig.id === "grocery") {
      console.log(`[Step 2 Hub] Fetching grocery shops from grocery API...`);
      setIsLoadingShops(true);
      setShowSkeleton(true);
      setAvailableShops([]);
      
      try {
        // Get user's current location for shop discovery
        if (startLocation && destination) {
          // Extract coordinates from startLocation (assuming it's a formatted address)
          // For now, we'll use a default location - in a real app, you'd geocode the startLocation
          const defaultLat = 28.6139; // Delhi coordinates as fallback
          const defaultLng = 77.2090;
          
            const groceryShops = await groceryFirestore.findNearbyShops(defaultLat, defaultLng, currentMaxDetour);
          console.log(`[Step 2 Hub] Grocery API returned ${groceryShops.length} shops`);
          
          const convertedShops: Vendor[] = groceryShops.map((shop) => ({
            id: shop.id,
            name: shop.shopName,
            shopName: shop.shopName,
            type: "Grocery Store",
            eta: shop.deliveryTime || "15 min",
            imageUrl: "https://placehold.co/300x150.png",
            dataAiHint: shop.shopName.toLowerCase(),
            categories: ["grocery"],
            simulatedDetourKm: shop.distance || 0,
            isActiveOnThru: shop.isOpen !== false,
            address: shop.address || "",
            coordinates: shop.location ? {
              lat: shop.location.latitude,
              lng: shop.location.longitude
            } : undefined,
            realDetourKm: shop.distance || 0,
            detourDuration: shop.deliveryTime
          }));
          
          console.log(`[Step 2 Hub] Converted ${convertedShops.length} grocery shops to vendors`);
          setAvailableShops(convertedShops);
        } else {
          console.warn(`[Step 2 Hub] No location data available for grocery shop discovery`);
          setAvailableShops([]);
        }
      } catch (error) {
        console.error(`[Step 2 Hub] Error fetching grocery shops:`, error);
        setAvailableShops([]);
      } finally {
        setIsLoadingShops(false);
        setShowSkeleton(false);
        setIsInitialLoad(false);
      }
      return;
    }
    
    // Check cache first for non-grocery categories
    if (vendorsCache.has(cacheKey)) {
      console.log(`[Step 2 Hub] Using cached vendors for types: ${cacheKey}`);
      const cachedVendors = vendorsCache.get(cacheKey) || [];
      const filteredVendors = cachedVendors.filter(shop => shop.simulatedDetourKm <= currentMaxDetour);
      setAvailableShops(filteredVendors);
      setIsInitialLoad(false);
      return;
    }
    
    setIsLoadingShops(true);
    setShowSkeleton(true);
    setAvailableShops([]);
    
    let firestoreFetchedVendors: Vendor[] = [];
    
    try {
      if (!db) {
        console.warn("[Step 2 Hub] Firestore not initialized, no vendors available");
        setAvailableShops([]);
        setIsLoadingShops(false);
        setShowSkeleton(false);
        setIsInitialLoad(false);
        return;
      }

      console.log(`[Step 2 Hub] Firebase initialized, fetching vendors from 'vendors' collection...`);
      
      let q;
      if (shopTypes.length > 0) {
        // Filter by specific shop types using storeCategory field
        console.log(`[Step 2 Hub] Filtering by shop types: ${shopTypes.join(', ')}`);
        q = query(collection(db, "vendors"), 
                  where("storeCategory", "in", shopTypes), 
                  where("isActive", "==", true)
                 );
      } else {
        // Get all active vendors if no specific types
        console.log(`[Step 2 Hub] Fetching all active vendors (no type filter)`);
        q = query(collection(db, "vendors"), 
                  where("isActive", "==", true)
                 );
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`[Step 2 Hub] Found ${querySnapshot.size} vendors in Firestore`);
      
      if (querySnapshot.empty) {
        console.warn(`[Step 2 Hub] No vendors found in Firestore for types: ${shopTypes.join(', ') || 'all'}`);
      } else {
        console.log(`[Step 2 Hub] Successfully found vendors for takeout food section`);
      }
      
      querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`[Step 2 Hub] Processing vendor ${doc.id}:`, {
            shopName: data.shopName,
            storeCategory: data.storeCategory,
            isActive: data.isActive,
            location: data.location,
            address: data.address,
            coordinates: data.location?.coordinates || data.coordinates
          });
          
          const vendorDisplayName = data.shopName;
          if (!vendorDisplayName) {
            console.warn(`[Step 2 Hub] Vendor ${doc.id} from Firestore is missing a 'shopName' field and will be skipped.`);
            return;
          }

          // Extract coordinates from Firebase data
          const coordinates = data.location?.coordinates || data.coordinates;
          const vendorCoordinates = coordinates ? {
            lat: coordinates.latitude || coordinates.lat,
            lng: coordinates.longitude || coordinates.lng
          } : undefined;

          // Default detour distance (fallback)
          const detourKm = 2.0;

          // Create categories array from storeCategory
          const categories: string[] = data.storeCategory ? [data.storeCategory] : [];

          const vendor: Vendor = { 
              id: doc.id, 
              name: vendorDisplayName,
              shopName: data.shopName,
              type: data.storeCategory || "Store",
              categories: categories,
              isActiveOnThru: data.isActive === true, 
              simulatedDetourKm: detourKm,
              imageUrl: data.imageUrl,
              dataAiHint: data.shopName.toLowerCase(),
              address: data.location?.formattedAddress || data.address || "",
              coordinates: vendorCoordinates,
          };
          
          firestoreFetchedVendors.push(vendor);
          console.log(`[Step 2 Hub] Added vendor: ${vendor.name} (${vendor.type}) - Detour: ${vendor.simulatedDetourKm}km`);
      });
      
      // Calculate real detour distances for vendors with coordinates
      if (startLocation && destination && firestoreFetchedVendors.length > 0) {
        console.log(`[Step 2 Hub] Calculating real detour distances for ${firestoreFetchedVendors.length} vendors...`);
        console.log(`[Step 2 Hub] Start location: ${startLocation}, Destination: ${destination}`);
        
        const vendorsWithRealDetours = await Promise.all(
          firestoreFetchedVendors.map(async (vendor) => {
            console.log(`[Step 2 Hub] Processing vendor ${vendor.name}:`, {
              hasCoordinates: !!vendor.coordinates,
              coordinates: vendor.coordinates
            });
            
            if (vendor.coordinates) {
              console.log(`[Step 2 Hub] Calculating detour for ${vendor.name}...`);
              const detourData = await calculateRealDetour(startLocation, destination, vendor.coordinates);
              if (detourData) {
                console.log(`[Step 2 Hub] Detour calculated for ${vendor.name}: ${detourData.distance}km, ${detourData.duration}`);
                return {
                  ...vendor,
                  realDetourKm: detourData.distance,
                  detourDuration: detourData.duration,
                  simulatedDetourKm: detourData.distance // Update simulated with real data
                };
              } else {
                console.log(`[Step 2 Hub] Detour calculation failed for ${vendor.name}, using fallback`);
              }
            } else {
              console.log(`[Step 2 Hub] No coordinates for ${vendor.name}, using fallback detour`);
            }
            return vendor; // Return original vendor if no coordinates or calculation failed
          })
        );
        
        // Filter vendors based on real detour distance
        const filteredVendors = vendorsWithRealDetours.filter(shop => 
          (shop.realDetourKm || shop.simulatedDetourKm) <= currentMaxDetour
        );
        
        console.log(`[Step 2 Hub] Filtered to ${filteredVendors.length} vendors within ${currentMaxDetour}km detour`);
        setAvailableShops(filteredVendors);
        
        // Cache the results with real detour data
        setVendorsCache(prev => new Map(prev).set(cacheKey, vendorsWithRealDetours));
        console.log(`[Step 2 Hub] Cached ${vendorsWithRealDetours.length} vendors with real detour data for key: ${cacheKey}`);
      } else {
        // Fallback to original logic if no coordinates or route data
        const filteredVendors = firestoreFetchedVendors.filter(shop => shop.simulatedDetourKm <= currentMaxDetour);
        setAvailableShops(filteredVendors);
        
        // Cache the results
        setVendorsCache(prev => new Map(prev).set(cacheKey, firestoreFetchedVendors));
        console.log(`[Step 2 Hub] Cached ${firestoreFetchedVendors.length} vendors for key: ${cacheKey}`);
      }
      
    } catch (error) {
      console.error(`[Step 2 Hub] Error fetching shops (types: ${shopTypes.join(', ')}) from Firestore:`, error);
      setAvailableShops([]);
      setIsLoadingShops(false);
      setShowSkeleton(false);
      setIsInitialLoad(false);
      return;
    }
    
    console.log(`[Step 2 Hub] Raw vendors fetched from Firestore:`, firestoreFetchedVendors.map(v => ({
      id: v.id, 
      name: v.name, 
      type: v.type, 
      active: v.isActiveOnThru, 
      detour: v.simulatedDetourKm 
    })));

    // Use only Firebase vendors - no mock data
    const shopsInDetour = firestoreFetchedVendors.filter(shop => shop.simulatedDetourKm <= currentMaxDetour);
    console.log(`[Step 2 Hub] Total shops from Firebase after detour filter: ${shopsInDetour.length}`);
    setAvailableShops(shopsInDetour);
    console.log(`[Step 2 Hub] Final shops for category '${categoryConfig.name}':`, shopsInDetour.map(s => ({
      id: s.id, 
      name: s.name, 
      type: s.type, 
      detour: s.simulatedDetourKm.toFixed(1)
    })));
    setIsLoadingShops(false);
    setShowSkeleton(false);
    setIsInitialLoad(false);
  };

  const fetchItemsForShop = async (vendorId: string) => {
    console.log(`[Step 2 Hub] fetchItemsForShop for vendorId: ${vendorId}`);
    setIsLoadingItems(true);
    setAvailableItems([]); 
    let fetchedItems: Item[] = [];
    try {
      if (!db) {
        console.warn("[Step 2 Hub] Firestore not initialized, skipping shop items fetch");
      } else {
        // Fetch from the new sub-collection structure: vendors/{vendorId}/inventory
        const inventoryRef = collection(db, "vendors", vendorId, "inventory");
        console.log(`[Step 2 Hub] Fetching from collection: vendors/${vendorId}/inventory`);
        
        // First, let's try to get all items without the filter to see what's there
        const allItemsQuery = query(inventoryRef);
        const allItemsSnapshot = await getDocs(allItemsQuery);
        console.log(`[Step 2 Hub] Total items in inventory (before filter): ${allItemsSnapshot.size}`);
        
        allItemsSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`[Step 2 Hub] Item ${doc.id}:`, {
            itemName: data.itemName,
            name: data.name,
            isAvailableOnThru: data.isAvailableOnThru,
            price: data.price,
            category: data.category
          });
        });
        
        // Now apply the filter
        const q = query(inventoryRef, where("isAvailableOnThru", "==", true));
        const querySnapshot = await getDocs(q);
        console.log(`[Step 2 Hub] Items with isAvailableOnThru=true: ${querySnapshot.size}`);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const item = { 
            id: doc.id, 
            ...data, 
            name: data.itemName || data.name || `Item ${doc.id}`, 
            category: data.vendorItemCategory || data.category || "unknown", 
            price: data.price || 0,
            vendorId: vendorId // Ensure vendorId is set
          } as Item;
          fetchedItems.push(item);
          console.log(`[Step 2 Hub] Added item: ${item.name} (${item.id})`);
        });
        console.log(`[Step 2 Hub] Firestore fetched ${fetchedItems.length} items for shop ${vendorId} from sub-collection.`);
      }
    } catch (error) {
      console.error(`[Step 2 Hub] Error fetching items for shop ${vendorId} from Firestore sub-collection:`, error);
    }

    // No mock data fallback - using only Firebase data
    
    setAvailableItems(fetchedItems);
    updateAllItemsMap(fetchedItems); 
    setIsLoadingItems(false);
  };

  const updateAllItemsMap = (itemsToAdd: Item[]) => {
    setAllItemsMap(prevMap => {
      const newMap = new Map(prevMap);
      itemsToAdd.forEach(item => newMap.set(item.id, item));
      return newMap;
    });
  };


  const handleShopSelect = (shop: Vendor) => {
    console.log(`[Step 2 Hub] Shop selected:`, {
      id: shop.id,
      name: shop.shopName,
      type: shop.type
    });
    setCurrentSelectedShop(shop);
    setViewMode("shop-item-list");
    setCurrentItemSearchQuery("");
    // Fetch items for this shop
    fetchItemsForShop(shop.id);
  };

  const updateGlobalItemQuantity = (itemId: string, newQuantity: number) => {
    setSelectedGlobalItems(prev => {
      const newSelection = { ...prev };
      if (newQuantity <= 0) delete newSelection[itemId];
      else newSelection[itemId] = newQuantity;
      return newSelection;
    });
  };
  
  const updateShopSpecificItemQuantity = (vendorId: string, itemId: string, newQuantity: number) => {
    setSelectedShopSpecificItems(prev => {
      const newShopItems = { ...(prev[vendorId] || {}) };
      if (newQuantity <= 0) delete newShopItems[itemId];
      else newShopItems[itemId] = newQuantity;
      if (Object.keys(newShopItems).length === 0) {
        const updatedAllShopItems = { ...prev };
        delete updatedAllShopItems[vendorId];
        return updatedAllShopItems;
      }
      return { ...prev, [vendorId]: newShopItems };
    });
    
    // Also update the allItemsMap to include vendorId for this item
    setAllItemsMap(prevMap => {
      const newMap = new Map(prevMap);
      const item = newMap.get(itemId);
      if (item) {
        newMap.set(itemId, { ...item, vendorId });
      }
      return newMap;
    });
  };

  const handleCategorySelect = async (category: MainCategoryConfig) => {
    console.log(`[Step 2 Hub] Category selected: ${category.name} (${category.id})`);
    setActiveMainCategory(category);
    
    if (category.type === "shop-first") {
      console.log(`[Step 2 Hub] Shop-first category selected, fetching shops...`);
      setViewMode("shop-list");
      await fetchRelevantShops(category, maxDetourKm);
    } else if (category.type === "item-first") {
      console.log(`[Step 2 Hub] Item-first category selected, fetching items...`);
      setViewMode("item-list");
      await fetchRelevantItems(category.id);
    }
  };

  const handleShopSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    console.log(`[Step 2 Hub] Searching for shops with term: "${searchTerm}"`);
    setIsLoadingShops(true);
    setAvailableShops([]);
    
    try {
      if (!db) {
        console.warn("[Step 2 Hub] Firestore not initialized, no search results available");
        setAvailableShops([]);
        setIsLoadingShops(false);
        return;
      }

      console.log(`[Step 2 Hub] Searching Firebase vendors collection for: "${searchTerm}"`);
      
      // Get all active vendors and filter client-side for better search results
      const allVendorsQuery = query(
        collection(db, "vendors"),
        where("isActive", "==", true)
      );
      
      const querySnapshot = await getDocs(allVendorsQuery);
      
      console.log(`[Step 2 Hub] Found ${querySnapshot.size} active vendors, filtering for: "${searchTerm}"`);
      
      const shops: Vendor[] = [];
      const searchTermLower = searchTerm.toLowerCase();
      
      // Filter vendors client-side for better search results
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`[Step 2 Hub] Processing vendor ${doc.id}:`, {
          shopName: data.shopName,
          storeCategory: data.storeCategory,
          isActive: data.isActive,
          address: data.address
        });
        
        const vendorDisplayName = data.shopName;
        if (!vendorDisplayName) {
          console.log(`[Step 2 Hub] Skipping vendor ${doc.id} - no shopName`);
          return;
        }
        
        // Check if search term matches shopName or storeCategory
        const shopNameMatch = vendorDisplayName.toLowerCase().includes(searchTermLower);
        const categoryMatch = data.storeCategory && data.storeCategory.toLowerCase().includes(searchTermLower);
        
        console.log(`[Step 2 Hub] Vendor ${vendorDisplayName}: nameMatch=${shopNameMatch}, categoryMatch=${categoryMatch}`);
        
        if (shopNameMatch || categoryMatch) {
          // Extract coordinates from Firebase data
          const coordinates = data.location?.coordinates || data.coordinates;
          const vendorCoordinates = coordinates ? {
            lat: coordinates.latitude || coordinates.lat,
            lng: coordinates.longitude || coordinates.lng
          } : undefined;

          const vendor: Vendor = {
            id: doc.id,
            name: vendorDisplayName,
            shopName: data.shopName,
            type: data.storeCategory || "Store",
            eta: data.eta || "15 min",
            imageUrl: data.imageUrl || "https://placehold.co/300x150.png",
            dataAiHint: data.shopName.toLowerCase(),
            categories: data.storeCategory ? [data.storeCategory] : [],
            simulatedDetourKm: 2.0,
            isActiveOnThru: data.isActive === true,
            address: data.location?.formattedAddress || data.address || "",
            coordinates: vendorCoordinates,
          };
          
          shops.push(vendor);
          console.log(`[Step 2 Hub] Added shop: ${vendor.name} (${shopNameMatch ? 'name match' : 'category match'})`);
        }
      });
      
      console.log(`[Step 2 Hub] Total search results: ${shops.length}`);
      
      if (shops.length === 0) {
        console.log(`[Step 2 Hub] No shops found for search term: "${searchTerm}"`);
        toast({
          title: "No Results",
          description: `No shops found for "${searchTerm}". Try a different search term.`,
          variant: "default"
        });
      } else {
        // Calculate real detour distances for search results
        if (startLocation && destination) {
          console.log(`[Step 2 Hub] Calculating real detour distances for search results...`);
          
          const shopsWithRealDetours = await Promise.all(
            shops.map(async (shop) => {
              if (shop.coordinates) {
                const detourData = await calculateRealDetour(startLocation, destination, shop.coordinates);
                if (detourData) {
                  return {
                    ...shop,
                    realDetourKm: detourData.distance,
                    detourDuration: detourData.duration,
                    simulatedDetourKm: detourData.distance
                  };
                }
              }
              return shop;
            })
          );
          
          setAvailableShops(shopsWithRealDetours);
        } else {
          setAvailableShops(shops);
        }
      }
      
      setViewMode("shop-list");
      setActiveMainCategory({
        id: "search",
        name: `Search Results for "${searchTerm}"`,
        icon: Search,
        type: "shop-first"
      });
      
    } catch (error) {
      console.error("[Step 2 Hub] Error searching shops:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for shops. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingShops(false);
    }
  };

  const handleBackNavigation = () => {
    setCurrentItemSearchQuery(""); 
    setCurrentShopSearchQuery("");
    if (viewMode === "item-list" || viewMode === "shop-list") {
      setViewMode("category-selection");
      setActiveMainCategory(null);
      setAvailableItems([]);
      setAvailableShops([]);
    } else if (viewMode === "shop-item-list") {
      setViewMode("shop-list"); 
      setCurrentSelectedShop(null);
      setAvailableItems([]); 
      if (activeMainCategory && activeMainCategory.type === "shop-first") {
        fetchRelevantShops(activeMainCategory, maxDetourKm);
      }
    } else if (viewMode === "category-selection") {
        router.push(`/plan-trip/step-1?start=${encodeURIComponent(startLocation || "")}&destination=${encodeURIComponent(destination || "")}&maxDetourKm=${maxDetourKm}`);
    }
  };

  const handleProceedToStep3 = () => {
    const globalItemsDataForNextStep: Record<string, string[]> = {}; 
    Object.keys(selectedGlobalItems).forEach(itemId => {
        const itemDetail = allItemsMap.get(itemId);
        if (itemDetail) {
            const mainCatId = itemDetail.category; 
            if (!globalItemsDataForNextStep[mainCatId]) {
                globalItemsDataForNextStep[mainCatId] = [];
            }
            if (!globalItemsDataForNextStep[mainCatId].includes(itemId)) {
                globalItemsDataForNextStep[mainCatId].push(itemId);
            }
        }
    });

    const shopSpecificDataForNextStep: Record<string, { vendorName: string; vendorType: string; items: Record<string, string[]> }> = {};
    Object.entries(selectedShopSpecificItems).forEach(([vendorId, itemsWithQuantities]) => {
        const vendorInfo = availableShops.find(v => v.id === vendorId) || 
                           (currentSelectedShop?.id === vendorId ? currentSelectedShop : null) ;
        
        if (vendorInfo) {
            shopSpecificDataForNextStep[vendorId] = {
                vendorName: vendorInfo.shopName || vendorInfo.name, 
                vendorType: vendorInfo.type,
                items: {} 
            };
            Object.keys(itemsWithQuantities).forEach(itemId => {
                const itemDetail = allItemsMap.get(itemId); 
                if (itemDetail) {
                    const itemCatKey = itemDetail.vendorItemCategory || itemDetail.category || "uncategorized";
                    if (!shopSpecificDataForNextStep[vendorId].items[itemCatKey]) {
                        shopSpecificDataForNextStep[vendorId].items[itemCatKey] = [];
                    }
                    if (!shopSpecificDataForNextStep[vendorId].items[itemCatKey].includes(itemId)) {
                        shopSpecificDataForNextStep[vendorId].items[itemCatKey].push(itemId);
                    }
                }
            });
        }
    });
    
    const params = new URLSearchParams({
      start: startLocation || "",
      destination: destination || "",
      maxDetourKm: maxDetourKm.toString(),
      selectedGlobalItemsData: JSON.stringify(globalItemsDataForNextStep), 
      selectedShopSpecificItemsData: JSON.stringify(shopSpecificDataForNextStep),
      selectedGlobalItemsQuantities: JSON.stringify(selectedGlobalItems),
      selectedShopSpecificItemsQuantities: JSON.stringify(selectedShopSpecificItems),
      preferSingleStore: preferSingleStore.toString(),
      userDestination: userDestination,
      departureTime: departureTime,
    });
    console.log("[Step 2 Hub] Proceeding to Step 3 with params:", params.toString());
    router.push(`/plan-trip/step-3?${params.toString()}`);
  };

  const getHeaderTitle = () => {
    if (viewMode === "item-list" && activeMainCategory) return `Add ${activeMainCategory.name}`;
    if (viewMode === "shop-list" && activeMainCategory) return `Select ${activeMainCategory.name} Shop`;
    if (viewMode === "shop-item-list" && currentSelectedShop) return `Items from ${currentSelectedShop.shopName || currentSelectedShop.name}`;
    return "Step 2 of 5: Select Items";
  };
  
  const getTotalSelectedItemCount = () => {
    let count = Object.values(selectedGlobalItems).reduce((sum, qty) => sum + qty, 0);
    Object.values(selectedShopSpecificItems).forEach(shopItems => {
        count += Object.values(shopItems).reduce((sum, qty) => sum + qty, 0);
    });
    return count;
  };

  // Handle item toggle (add/remove from cart)
  const handleItemToggle = (itemId: string, type: "global" | "shop-specific") => {
    if (type === "global") {
      setSelectedGlobalItems(prev => {
        const newItems = { ...prev };
        if (newItems[itemId]) {
          delete newItems[itemId];
        } else {
          newItems[itemId] = 1;
        }
        return newItems;
      });
    } else if (type === "shop-specific" && currentSelectedShop) {
      setSelectedShopSpecificItems(prev => {
        const newItems = { ...prev };
        if (!newItems[currentSelectedShop.id]) {
          newItems[currentSelectedShop.id] = {};
        }
        if (newItems[currentSelectedShop.id][itemId]) {
          delete newItems[currentSelectedShop.id][itemId];
        } else {
          newItems[currentSelectedShop.id][itemId] = 1;
        }
        return newItems;
      });
    }
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: string, newQuantity: number, type: "global" | "shop-specific") => {
    if (newQuantity <= 0) {
      handleItemToggle(itemId, type);
      return;
    }

    if (type === "global") {
      setSelectedGlobalItems(prev => ({
        ...prev,
        [itemId]: newQuantity
      }));
    } else if (type === "shop-specific" && currentSelectedShop) {
      setSelectedShopSpecificItems(prev => ({
        ...prev,
        [currentSelectedShop.id]: {
          ...prev[currentSelectedShop.id],
          [itemId]: newQuantity
        }
      }));
    }
  };

    // Real-time grocery search with Firestore subscription
    React.useEffect(() => {
      if (activeMainCategory?.id === "grocery") {
        setIsSearchingGrocery(true);
        
        const unsubscribe = groceryFirestore.subscribeToProducts(
          currentItemSearchQuery,
          20,
          (products) => {
            const convertedResults = products.map((product: GroceryProduct) => ({
              id: product.id,
              name: product.display_name,
              category: product.category || "grocery",
              imageUrl: product.image_url || "https://placehold.co/80x80.png",
              dataAiHint: product.product_name.toLowerCase(),
              details: `${product.pack_value} ${product.pack_unit}`,
              price: product.price,
              originalPrice: product.price,
              isAvailableOnThru: true,
              vendorId: "",
              itemName: product.display_name,
              vendorItemCategory: product.category || "grocery",
              description: product.description || `${product.pack_value} ${product.pack_unit}`
            } as Item));
            setGrocerySearchResults(convertedResults);
            setIsSearchingGrocery(false);
          }
        );

        return () => unsubscribe();
      } else {
        setGrocerySearchResults([]);
        setIsSearchingGrocery(false);
      }
    }, [currentItemSearchQuery, activeMainCategory?.id]);


  if (!startLocation || !destination) {
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Loading route information...</p></div>);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <h1 className="text-xl font-semibold truncate">{getHeaderTitle()}</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Back Button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-background border-2 border-primary hover:bg-primary hover:text-primary-foreground" 
                onClick={handleBackNavigation}
                title="Back"
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </Button>
              
              {/* Done Button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-background border-2 border-primary hover:bg-primary hover:text-primary-foreground" 
                onClick={handleProceedToStep3}
                title="Done"
              >
                <Check className="h-5 w-5 text-primary" />
              </Button>
              
              {/* Home Button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-background border-2 border-primary hover:bg-primary hover:text-primary-foreground" 
                onClick={() => router.push('/home')}
                title="Home"
              >
                <Home className="h-5 w-5 text-primary" />
              </Button>
            </div>
        </div>
        <div className="flex justify-around">
            {[1,2,3,4,5].map((step) => (
            <Button key={step} variant="default" size="sm" className={cn("rounded-full w-10 h-10 p-0 flex items-center justify-center",
                step === 2 ? "bg-foreground text-background hover:bg-foreground/90" : 
                step < 2 ? "bg-green-500 text-white hover:bg-green-600" : 
                "bg-primary text-primary-foreground border border-primary-foreground hover:bg-primary/80")}>
            {step < 2 ? <Check className="h-5 w-5" /> : step}
            </Button>))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {viewMode === "category-selection" && (
          <>
            {/* Search Shop Field */}
            <Card className="p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for a specific shop..." 
                  value={currentShopSearchQuery} 
                  onChange={(e) => setCurrentShopSearchQuery(e.target.value)} 
                  className="pl-10"
                />
                {currentShopSearchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                    onClick={() => setCurrentShopSearchQuery("")}
                  >
                    <X className="h-4 w-4"/>
                  </Button>
                )}
              </div>
              {currentShopSearchQuery && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleShopSearch(currentShopSearchQuery)}
                  >
                    Search for "{currentShopSearchQuery}"
                  </Button>
                </div>
              )}
            </Card>

            {/* Destination and Departure Time Fields */}
            <Card className="p-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trip Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-destination" className="text-sm font-medium text-foreground">Your Destination</Label>
                  <Input
                    id="user-destination"
                    placeholder="Where are you heading?"
                    value={userDestination}
                    onChange={(e) => setUserDestination(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="departure-time" className="text-sm font-medium text-foreground">Departure Time</Label>
                  <Input
                    id="departure-time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {MAIN_CATEGORIES_CONFIG.map(cat => (
                <Card key={cat.id} className="shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-xl overflow-hidden" onClick={() => handleCategorySelect(cat)}>
                  <CardContent className="p-4 flex flex-col items-center justify-center aspect-square">
                    <cat.icon className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-center text-foreground">{cat.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {(viewMode === "item-list" || viewMode === "shop-item-list") && (
          <>
            {activeMainCategory?.type === 'item-first' && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="store-preference-switch" className="font-semibold">Shopping Preference</Label>
                    <p className="text-sm text-muted-foreground">How should we group your items?</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="store-preference-switch" className={cn(preferSingleStore ? "text-muted-foreground" : "text-primary font-semibold")}>Multiple</Label>
                    <Switch
                      id="store-preference-switch"
                      checked={preferSingleStore}
                      onCheckedChange={setPreferSingleStore}
                      aria-label="Toggle between single and multiple store preference"
                    />
                    <Label htmlFor="store-preference-switch" className={cn(preferSingleStore ? "text-primary font-semibold" : "text-muted-foreground")}>Single</Label>
                  </div>
                </div>
              </Card>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder={`Search in ${activeMainCategory?.name || currentSelectedShop?.name || 'items'}...`} value={currentItemSearchQuery} onChange={(e) => setCurrentItemSearchQuery(e.target.value)} className="pl-10"/>
              {currentItemSearchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setCurrentItemSearchQuery("")}><X className="h-4 w-4"/></Button>}
            </div>
            {(isLoadingItems || isSearchingGrocery) && <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {!isLoadingItems && !isSearchingGrocery && filteredItems.length === 0 && <p className="text-center text-muted-foreground py-5">No items found.</p>}
            {!isLoadingItems && !isSearchingGrocery && filteredItems.length > 0 && (
              <div className="space-y-3">
                {filteredItems.map(item => {
                  const currentQuantity = viewMode === "item-list" 
                                        ? selectedGlobalItems[item.id] || 0
                                        : (currentSelectedShop && selectedShopSpecificItems[currentSelectedShop.id]?.[item.id]) || 0;
                  return (
                    <Card key={item.id} className={cn("p-3 space-y-3 shadow-sm", currentQuantity > 0 && "ring-2 ring-primary")}>
                      <div className="flex items-center space-x-3">
                        <Image src={item.imageUrl || "https://placehold.co/80x80.png"} alt={item.name} width={70} height={70} className="rounded-md border bg-muted object-cover" data-ai-hint={item.dataAiHint || "item image"}/>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.details && <p className="text-xs text-muted-foreground">{item.details}</p>}
                          <p className="text-sm font-semibold text-primary mt-1">₹{item.price.toFixed(2)}</p>
                        </div>
                         <div className="flex items-center space-x-2">
                          {currentQuantity > 0 ? (
                            <>
                              <Button variant="outline" size="icon" className="h-7 w-7" 
                                      onClick={() => viewMode === 'item-list' 
                                          ? updateGlobalItemQuantity(item.id, currentQuantity - 1) 
                                          : updateShopSpecificItemQuantity(currentSelectedShop!.id, item.id, currentQuantity - 1)}>
                                  <MinusCircle className="h-4 w-4" />
                              </Button>
                              <span className="text-sm font-medium w-5 text-center">{currentQuantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7" 
                                      onClick={() => viewMode === 'item-list' 
                                          ? updateGlobalItemQuantity(item.id, currentQuantity + 1)
                                          : updateShopSpecificItemQuantity(currentSelectedShop!.id, item.id, currentQuantity + 1)}>
                                  <PlusCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                             <Button variant="outline" size="sm" 
                                      onClick={() => viewMode === 'item-list' 
                                          ? updateGlobalItemQuantity(item.id, 1) 
                                          : updateShopSpecificItemQuantity(currentSelectedShop!.id, item.id, 1)}>Add</Button>
                          )}
                        </div>
                      </div>
                      
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {viewMode === "item-list" && activeMainCategory && (
          <>
            {/* Shopping Preference Toggle */}
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Shopping Preference</h3>
                  <p className="text-sm text-muted-foreground">How should we group your items?</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", !preferSingleStore ? "text-foreground" : "text-muted-foreground")}>Multiple</span>
                  <Switch
                    checked={preferSingleStore}
                    onCheckedChange={setPreferSingleStore}
                  />
                  <span className={cn("text-sm", preferSingleStore ? "text-foreground" : "text-muted-foreground")}>Single</span>
                </div>
              </div>
            </Card>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search in Groceries..." 
                value={currentItemSearchQuery} 
                onChange={(e) => setCurrentItemSearchQuery(e.target.value)} 
                className="pl-10"
              />
              {currentItemSearchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                  onClick={() => setCurrentItemSearchQuery("")}
                >
                  <X className="h-4 w-4"/>
                </Button>
              )}
            </div>

            {/* Items List */}
            {isLoadingItems && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="shadow-md rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-32 bg-muted"></div>
                    <CardContent className="p-3">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingItems && filteredItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No items found.</p>
                {currentItemSearchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">Try a different search term</p>
                )}
              </div>
            )}

            {!isLoadingItems && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow rounded-lg overflow-hidden">
                    <div className="relative">
                      {item.imageUrl && (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          width={300} 
                          height={150} 
                          className="w-full h-32 object-cover" 
                          data-ai-hint={item.dataAiHint || "grocery item"}
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemToggle(item.id, "global");
                          }}
                        >
                          {selectedGlobalItems[item.id] ? (
                            <MinusCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <PlusCircle className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-foreground text-base truncate">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.details}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-accent">₹{item.price}</span>
                        {selectedGlobalItems[item.id] && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.id, selectedGlobalItems[item.id] - 1, "global")}
                            >
                              <MinusCircle className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium">{selectedGlobalItems[item.id]}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.id, selectedGlobalItems[item.id] + 1, "global")}
                            >
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "shop-list" && activeMainCategory && (
          <>
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder={`Search in ${activeMainCategory.name} shops...`} value={currentShopSearchQuery} onChange={(e) => setCurrentShopSearchQuery(e.target.value)} className="pl-10"/>
              {currentShopSearchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setCurrentShopSearchQuery("")}><X className="h-4 w-4"/></Button>}
            </div>
            {isLoadingShops && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="shadow-md rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-32 bg-muted"></div>
                    <CardContent className="p-3">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingShops && filteredShops.length === 0 && <p className="text-center text-muted-foreground py-5">No {activeMainCategory.name} shops found within {maxDetourKm.toFixed(1)}km detour or matching your search.</p>}
            {!isLoadingShops && filteredShops.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredShops.map(shop => (
                  <Card key={shop.id} className="shadow-md hover:shadow-lg transition-shadow cursor-pointer rounded-lg overflow-hidden" onClick={() => handleShopSelect(shop)}>
                     {shop.imageUrl && <Image src={shop.imageUrl} alt={shop.shopName || shop.name} width={300} height={150} className="w-full h-32 object-cover" data-ai-hint={shop.dataAiHint || "shop exterior"}/>}
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-foreground text-base truncate">{shop.shopName || shop.name}</h3>
                      <p className="text-xs text-muted-foreground">{shop.type}</p>
                      {shop.address && <p className="text-xs text-muted-foreground truncate">{shop.address}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-accent">
                          {shop.realDetourKm ? `${shop.realDetourKm.toFixed(1)} km` : `${shop.simulatedDetourKm.toFixed(1)} km`} detour
                        </p>
                        {shop.detourDuration && (
                          <p className="text-xs text-muted-foreground">+{shop.detourDuration}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {viewMode === "category-selection" && (
        <div className="p-4 border-t bg-background sticky bottom-0 z-10">
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" 
            onClick={handleProceedToStep3}
            disabled={getTotalSelectedItemCount() === 0}
          >
            Review Shops &amp; Route ({getTotalSelectedItemCount()} items)
          </Button>
        </div>
      )}
      
      {/* Enhanced Shopping Cart for Grocery */}
      {activeMainCategory?.id === "grocery" && (
        <ShoppingCartEnhanced 
          userLocation={startLocation && destination ? {
            latitude: 28.6139, // Default coordinates - in real app, geocode startLocation
            longitude: 77.2090,
            address: startLocation
          } : undefined}
          onOrderPlaced={(orderId) => {
            toast({
              title: "Order Placed!",
              description: `Your grocery order #${orderId} has been placed successfully.`,
            });
          }}
        />
      )}
      
      <BottomNav />
    </div>
  );
}

export default function PlanTripStep2Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading item selection...</p>
        </div>
      </div>
    }>
      <PlanTripStep2PageContent />
    </Suspense>
  );
}

    