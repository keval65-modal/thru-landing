"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Search, 
  MapPin, 
  LocateFixed, 
  ArrowRightLeft, 
  Loader2, 
  Home,
  Store,
  Utensils, 
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  Trash2,
  Clock,
  Calendar,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/layout/bottom-nav";
import { EnhancedGrocerySearch } from "@/components/EnhancedGrocerySearch";
import { StructuredQuantityInput } from "@/components/StructuredQuantityInput";
import { VendorOffersDisplay } from "@/components/VendorOffersDisplay";
import { DynamicProduct } from "@/lib/scalable-grocery-ai-service";
import { purchasePatternTracker } from "@/lib/purchase-pattern-tracker";
import { VendorRequestPayload, AggregatedItemOffer } from "@/types/vendor-requests";
import { enhancedOrderService } from "@/lib/enhanced-order-service";

function HomePageContent() {
  const router = useRouter();
  const { toast } = useToast();

  // Location states
  const [startLocationQuery, setStartLocationQuery] = React.useState("");
  const [selectedStartLocation, setSelectedStartLocation] = React.useState<string | null>(null);
  const [destinationQuery, setDestinationQuery] = React.useState("");
  const [selectedDestination, setSelectedDestination] = React.useState<string | null>(null);
  const [maxDetourKm, setMaxDetourKm] = React.useState<number>(5);
  const [departureTime, setDepartureTime] = React.useState<string>("");
  const [isImmediate, setIsImmediate] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = React.useState(false);
  const [selectedTime, setSelectedTime] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [routeStops, setRouteStops] = React.useState<Array<{id: string, name: string, type: 'grocery' | 'food' | 'other', address: string, coordinates: {lat: number, lng: number}}>>([]);
  const [showAddStop, setShowAddStop] = React.useState(false);
  const [newStopName, setNewStopName] = React.useState("");
  const [newStopType, setNewStopType] = React.useState<'grocery' | 'food' | 'other'>('other');
  const [stopSuggestions, setStopSuggestions] = React.useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);

  // Category selection states
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<"grocery" | "food" | "vendor-request">("grocery");

  // Grocery states
  const [grocerySearchQuery, setGrocerySearchQuery] = React.useState("");
  const [groceryItems, setGroceryItems] = React.useState<Array<{id: string, name: string, quantity: number, unit: string, selectedQuantity?: number}>>([]);
  const [grocerySuggestions, setGrocerySuggestions] = React.useState<Array<{id: string, name: string, estimatedPrice?: number, availableUnits?: Array<{unit: string, quantity: number}>}>>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showQuantitySelector, setShowQuantitySelector] = React.useState<string | null>(null);

  // Vendor request states
  const [currentRequestId, setCurrentRequestId] = React.useState<string | null>(null);
  const [showVendorOffers, setShowVendorOffers] = React.useState(false);

  // Food states
  const [showAllFood, setShowAllFood] = React.useState(false);
  const [showVegOnly, setShowVegOnly] = React.useState(false);
  const [ratingFilter, setRatingFilter] = React.useState<"all" | "top-rated" | "new">("all");
  const [cuisineFilter, setCuisineFilter] = React.useState<string>("all");
  const [costFilter, setCostFilter] = React.useState<string>("all");
  const [prepTimeFilter, setPrepTimeFilter] = React.useState<string>("all");
  const [foodShops, setFoodShops] = React.useState<any[]>([]);
  const [loadingFoodShops, setLoadingFoodShops] = React.useState(false);

  // Google Maps states
  const [isGoogleMapsScriptLoaded, setIsGoogleMapsScriptLoaded] = React.useState(false);
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = React.useState(false);

  const startInputRef = React.useRef<HTMLInputElement>(null);
  const destinationInputRef = React.useRef<HTMLInputElement>(null);
  const startAutocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize Google Maps
  React.useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API Key not configured");
      setIsGoogleMapsScriptLoaded(true);
    }
  }, [GOOGLE_MAPS_API_KEY]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && GOOGLE_MAPS_API_KEY) {
      (window as any).initMapCallbackForHome = () => {
        if (typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined' && typeof window.google.maps.places !== 'undefined') {
          setIsGoogleMapsScriptLoaded(true);
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).initMapCallbackForHome;
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Initialize autocomplete
  React.useEffect(() => {
    if (isGoogleMapsScriptLoaded && GOOGLE_MAPS_API_KEY && startInputRef.current && !startAutocompleteRef.current) {
      try {
        startAutocompleteRef.current = new window.google.maps.places.Autocomplete(startInputRef.current);
        startAutocompleteRef.current.addListener("place_changed", () => {
          const place = startAutocompleteRef.current?.getPlace();
          if (place && (place.formatted_address || place.name)) {
            const newStartLocation = place.formatted_address || place.name || "";
            setSelectedStartLocation(newStartLocation);
            setStartLocationQuery(newStartLocation);
          }
        });
    } catch (error) {
        console.error("Error initializing start autocomplete:", error);
      }
    }
  }, [isGoogleMapsScriptLoaded, GOOGLE_MAPS_API_KEY]);

  React.useEffect(() => {
    if (isGoogleMapsScriptLoaded && GOOGLE_MAPS_API_KEY && destinationInputRef.current && !destAutocompleteRef.current) {
      try {
        destAutocompleteRef.current = new window.google.maps.places.Autocomplete(destinationInputRef.current);
        destAutocompleteRef.current.addListener("place_changed", () => {
          const place = destAutocompleteRef.current?.getPlace();
          if (place && (place.formatted_address || place.name)) {
            const newDestination = place.formatted_address || place.name || "";
            setSelectedDestination(newDestination);
            setDestinationQuery(newDestination);
          }
        });
      } catch (error) {
        console.error("Error initializing destination autocomplete:", error);
      }
    }
  }, [isGoogleMapsScriptLoaded, GOOGLE_MAPS_API_KEY]);

  // Handle current location
  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get place name using reverse geocoding
        if (window.google?.maps) {
          const geocoder = new window.google.maps.Geocoder();
          const latlng = { lat: latitude, lng: longitude };
          
          try {
            const results = await new Promise<any[]>((resolve) => {
              geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  resolve(results);
                } else {
                  resolve([]);
                }
              });
            });
            
            if (results && results.length > 0) {
              const placeName = results[0].formatted_address || results[0].address_components?.[0]?.long_name || 'Current Location';
              setStartLocationQuery(placeName);
              setSelectedStartLocation(placeName);
            } else {
              // Fallback to coordinates if geocoding fails
              setStartLocationQuery(`${latitude}, ${longitude}`);
              setSelectedStartLocation(`${latitude}, ${longitude}`);
            }
          } catch (error) {
            console.error("Error with reverse geocoding:", error);
            // Fallback to coordinates
            setStartLocationQuery(`${latitude}, ${longitude}`);
            setSelectedStartLocation(`${latitude}, ${longitude}`);
          }
        } else {
          // Fallback to coordinates if Google Maps not loaded
          setStartLocationQuery(`${latitude}, ${longitude}`);
          setSelectedStartLocation(`${latitude}, ${longitude}`);
        }
        
        setIsFetchingCurrentLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location access denied",
          description: "Please allow location access or enter manually.",
          variant: "destructive",
        });
        setIsFetchingCurrentLocation(false);
      }
    );
  };

  // Handle location swap
  const handleSwapLocations = () => {
    const tempLocation = startLocationQuery;
    const tempSelected = selectedStartLocation;
    setStartLocationQuery(destinationQuery);
    setSelectedStartLocation(selectedDestination);
    setDestinationQuery(tempLocation);
    setSelectedDestination(tempSelected);
  };

  // Handle category toggle
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Grocery functions
  const addGroceryItem = (item: any) => {
    if (item.availableUnits && item.availableUnits.length > 1) {
      setShowQuantitySelector(item.id);
      return;
    }
    
    const newItem = {
      id: `grocery_${Date.now()}`,
      name: item.name,
      quantity: 1,
      unit: item.availableUnits?.[0]?.unit || 'piece',
      selectedQuantity: item.availableUnits?.[0]?.quantity || 1
    };
    setGroceryItems(prev => [...prev, newItem]);
    setGrocerySearchQuery("");
    setGrocerySuggestions([]);
  };

  const addCustomGroceryItem = () => {
    if (grocerySearchQuery.trim()) {
      const newItem = {
        id: `grocery_${Date.now()}`,
        name: grocerySearchQuery.trim(),
        quantity: 1,
        unit: 'piece',
        selectedQuantity: 1
      };
      setGroceryItems(prev => [...prev, newItem]);
      setGrocerySearchQuery("");
      setGrocerySuggestions([]);
    }
  };

  const updateGroceryQuantity = (id: string, change: number) => {
    setGroceryItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const removeGroceryItem = (id: string) => {
    setGroceryItems(prev => prev.filter(item => item.id !== id));
  };

  const selectQuantity = (itemId: string, unit: string, quantity: number) => {
    const newItem = {
      id: `grocery_${Date.now()}`,
      name: grocerySuggestions.find(item => item.id === itemId)?.name || '',
      quantity: 1,
      unit,
      selectedQuantity: quantity
    };
    setGroceryItems(prev => [...prev, newItem]);
    setGrocerySearchQuery("");
    setGrocerySuggestions([]);
    setShowQuantitySelector(null);
  };

  // Search grocery items with debouncing
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (grocerySearchQuery.trim()) {
        setIsSearching(true);
        // Mock search suggestions
        const mockSuggestions = [
          {
            id: 'tomato',
            name: 'Fresh Tomatoes',
            estimatedPrice: 50,
            availableUnits: [
              { unit: 'kg', quantity: 1 },
              { unit: 'kg', quantity: 2 },
              { unit: 'kg', quantity: 5 }
            ]
          },
          {
            id: 'onion',
            name: 'Red Onions',
            estimatedPrice: 30,
            availableUnits: [
              { unit: 'kg', quantity: 1 },
              { unit: 'kg', quantity: 2 }
            ]
          },
          {
            id: 'rice',
            name: 'Basmati Rice',
            estimatedPrice: 80,
            availableUnits: [
              { unit: 'kg', quantity: 1 },
              { unit: 'kg', quantity: 5 },
              { unit: 'kg', quantity: 10 }
            ]
          }
        ].filter(item => 
          item.name.toLowerCase().includes(grocerySearchQuery.toLowerCase())
        );
        
        setGrocerySuggestions(mockSuggestions);
        setIsSearching(false);
      } else {
        setGrocerySuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [grocerySearchQuery]);

  // Filter options
  const cuisineOptions = ["all", "indian", "chinese", "italian", "mexican", "thai", "japanese"];
  const costOptions = [
    { value: "all", label: "Any Price" },
    { value: "under-500", label: "Under ₹500" },
    { value: "500-1000", label: "₹500 - ₹1000" },
    { value: "1000-2000", label: "₹1000 - ₹2000" },
    { value: "over-2000", label: "Over ₹2000" }
  ];
  const prepTimeOptions = [
    { value: "all", label: "Any Time" },
    { value: "under-15", label: "Under 15 min" },
    { value: "15-30", label: "15-30 min" },
    { value: "30-45", label: "30-45 min" },
    { value: "over-45", label: "Over 45 min" }
  ];

  const canProceed = selectedStartLocation && selectedDestination && departureTime && selectedCategories.length > 0;

  // Handle immediate departure
  const handleImmediateChange = (checked: boolean) => {
    setIsImmediate(checked);
    if (checked) {
      // Get current device time and store it as local time
      const now = new Date();
      // Create a local datetime string that preserves the local time
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setDepartureTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setDepartureTime("");
    }
  };

  // Handle time selection from clock picker
  const handleTimeSelect = (time: string) => {
    if (isImmediate) return;
    
    const now = new Date();
    const [hours, minutes] = time.split(':');
    
    // Create a new date with the selected time for today
    const selectedTime = new Date(now);
    selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If selected time is in the past, set for tomorrow
    if (selectedTime < now) {
      selectedTime.setDate(selectedTime.getDate() + 1);
    }
    
    setDepartureTime(selectedTime.toISOString().slice(0, 16));
    setShowTimePicker(false);
  };

  // Format time for display - use device's local timezone
  const formatISTTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format time for IST time display only - use device's local timezone
  const formatISTTimeOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle date and time selection for "Add for later"
  const handleDateTimeSelect = () => {
    if (!selectedDate || !selectedTime) return;
    
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    setDepartureTime(dateTime.toISOString().slice(0, 16));
    setShowDateTimePicker(false);
  };

  // Quick time options - use device's local timezone
  const quickTimeOptions = [
    { label: "15 mins", value: () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 15 * 60 * 1000);
      const year = futureTime.getFullYear();
      const month = String(futureTime.getMonth() + 1).padStart(2, '0');
      const day = String(futureTime.getDate()).padStart(2, '0');
      const hours = String(futureTime.getHours()).padStart(2, '0');
      const minutes = String(futureTime.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }},
    { label: "30 mins", value: () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 30 * 60 * 1000);
      const year = futureTime.getFullYear();
      const month = String(futureTime.getMonth() + 1).padStart(2, '0');
      const day = String(futureTime.getDate()).padStart(2, '0');
      const hours = String(futureTime.getHours()).padStart(2, '0');
      const minutes = String(futureTime.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }},
    { label: "1 hour", value: () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
      const year = futureTime.getFullYear();
      const month = String(futureTime.getMonth() + 1).padStart(2, '0');
      const day = String(futureTime.getDate()).padStart(2, '0');
      const hours = String(futureTime.getHours()).padStart(2, '0');
      const minutes = String(futureTime.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }}
  ];

  // Google Places API integration for stop suggestions
  const searchStopSuggestions = React.useCallback(async (query: string) => {
    if (!query.trim() || !window.google?.maps?.places) return;
    
    setIsLoadingSuggestions(true);
    try {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ['establishment'],
        componentRestrictions: { country: 'in' } // Restrict to India
      };

      service.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            formatted_address: prediction.description,
            geometry: { location: { lat: 0, lng: 0 } } // Will be filled by place details
          }));
          setStopSuggestions(suggestions);
        } else {
          setStopSuggestions([]);
        }
        setIsLoadingSuggestions(false);
      });
    } catch (error) {
      console.error('Error fetching stop suggestions:', error);
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Get place details for selected suggestion
  const getPlaceDetails = React.useCallback(async (placeId: string) => {
    if (!window.google?.maps?.places) return null;
    
    return new Promise((resolve) => {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'geometry']
      };

      service.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve({
            name: place.name || '',
            address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0
            }
          });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  // Handle AI-powered grocery product selection with purchase tracking
  const handleAIGroceryProductSelect = async (product: DynamicProduct, quantity: {quantity: number, unit: string, packSize?: string}) => {
    const newItem = {
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      quantity: quantity.quantity,
      unit: quantity.unit,
      selectedQuantity: quantity.quantity
    };
    
    setGroceryItems(prev => [...prev, newItem]);
    
    // Track the purchase for pattern analysis
    const userId = "user_123"; // In production, get from auth context
    await purchasePatternTracker.trackPurchase(
      userId,
      product.name,
      product.category,
      quantity.quantity,
      quantity.unit,
      quantity.packSize,
      product.source,
      `order_${Date.now()}`
    );
    
    toast({
      title: "Item Added!",
      description: `${quantity.quantity} ${quantity.unit} of ${product.name} added to your list (from ${product.source})`,
    });
  };

  // Handle vendor request submission
  const handleVendorRequestSubmit = async (request: VendorRequestPayload) => {
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vendor request');
      }

      const result = await response.json();
      setCurrentRequestId(result.request_id);
      setShowVendorOffers(true);
      
      toast({
        title: "Request Sent!",
        description: `Your request has been sent to nearby vendors. Request ID: ${result.request_id}`,
      });
    } catch (error) {
      console.error('Error submitting vendor request:', error);
      toast({
        title: "Error",
        description: "Failed to submit vendor request. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle vendor offer acceptance
  const handleVendorOfferAccept = async (vendorId: string, offers: AggregatedItemOffer[]) => {
    if (!currentRequestId) return;

    try {
      const orderPayload = {
        request_id: currentRequestId,
        vendor_id: vendorId,
        accepted_offers: offers.map(offer => ({
          request_item_id: offer.request_item_id,
          offer_type: offer.offer_type === 'exact' ? 'exact_qty_offer' : 'pack_offer',
          final_price: offer.price_total,
          final_qty_value: offer.fulfillment_qty_value,
          final_qty_unit: offer.fulfillment_qty_unit
        })),
        total_amount: offers.reduce((sum, offer) => sum + offer.price_total, 0),
        currency: 'INR',
        delivery_address: {
          lat: 12.97, // Default Bangalore coordinates
          lng: 77.59,
          address: `${startLocationQuery} to ${destinationQuery}`
        }
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const result = await response.json();
      
      toast({
        title: "Order Created!",
        description: `Order ${result.order_id} has been created and sent to vendor ${vendorId}`,
      });

      // Navigate to order tracking
      router.push(`/order-tracking/${result.order_id}`);
    } catch (error) {
      console.error('Error accepting vendor offer:', error);
      toast({
        title: "Error",
        description: "Failed to accept vendor offer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Track order completion for purchase pattern analysis
  const trackOrderCompletion = async () => {
    if (groceryItems.length === 0) return;
    
    const userId = "user_123"; // In production, get from auth context
    const orderId = `order_${Date.now()}`;
    
    const items = groceryItems.map(item => ({
      name: item.name,
      category: "Grocery", // In production, get from product data
      quantity: item.quantity,
      unit: item.unit,
      packSize: undefined,
      source: "thru_app"
    }));
    
    const totalAmount = groceryItems.reduce((sum, item) => sum + (item.quantity * 50), 0); // Mock calculation
    
    await purchasePatternTracker.trackOrderCompletion(userId, orderId, items, totalAmount);
    
    toast({
      title: "Order Tracked!",
      description: "Your purchase patterns have been updated for better recommendations.",
    });
  };

  // Load food shops along route
  const loadFoodShops = React.useCallback(async () => {
    if (!selectedStartLocation || !selectedDestination) {
      return;
    }

    setLoadingFoodShops(true);
    try {
      // Get coordinates from selected locations
      const startDetails = await getPlaceDetails(selectedStartLocation);
      const destDetails = await getPlaceDetails(selectedDestination);

      if (!startDetails || !destDetails) {
        console.error('Could not get place details');
        return;
      }

      const startCoords = (startDetails as any).coordinates;
      const destCoords = (destDetails as any).coordinates;
      const startAddress = (startDetails as any).address || startLocationQuery;
      const destAddress = (destDetails as any).address || destinationQuery;

      console.log('🍽️ Finding food shops along route:', { startCoords, destCoords });

      // Use enhanced order service to find food shops
      const shops = await enhancedOrderService.findShopsAlongRoute(
        { latitude: startCoords.lat, longitude: startCoords.lng, address: startAddress },
        { latitude: destCoords.lat, longitude: destCoords.lng, address: destAddress },
        maxDetourKm,
        ['restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub']
      );

      console.log(`✅ Found ${shops.length} food shops`);
      setFoodShops(shops);

      if (shops.length > 0) {
        toast({
          title: "Food Shops Found!",
          description: `Discovered ${shops.length} food outlet${shops.length > 1 ? 's' : ''} along your route.`,
        });
      }
    } catch (error) {
      console.error('Error loading food shops:', error);
      toast({
        title: "Error",
        description: "Could not load food shops. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingFoodShops(false);
    }
  }, [selectedStartLocation, selectedDestination, maxDetourKm, toast]);

  // Load food shops when route changes or when food tab becomes active
  React.useEffect(() => {
    if (activeTab === 'food' && selectedStartLocation && selectedDestination) {
      loadFoodShops();
    }
  }, [activeTab, selectedStartLocation, selectedDestination, loadFoodShops]);

  // Handle adding route stops
  const addRouteStop = async (suggestion?: typeof stopSuggestions[0]) => {
    if (suggestion) {
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        const newStop = {
          id: `stop_${Date.now()}`,
          name: (placeDetails as any).name,
          type: newStopType,
          address: (placeDetails as any).address,
          coordinates: (placeDetails as any).coordinates
        };
        setRouteStops(prev => [...prev, newStop]);
        setNewStopName("");
        setNewStopType('other');
        setShowAddStop(false);
        setStopSuggestions([]);
      }
    } else if (newStopName.trim()) {
      // Fallback for manual entry
      const newStop = {
        id: `stop_${Date.now()}`,
        name: newStopName.trim(),
        type: newStopType,
        address: newStopName.trim(),
        coordinates: { lat: 0, lng: 0 }
      };
      setRouteStops(prev => [...prev, newStop]);
      setNewStopName("");
      setNewStopType('other');
      setShowAddStop(false);
      setStopSuggestions([]);
    }
  };

  const removeRouteStop = (stopId: string) => {
    setRouteStops(prev => prev.filter(stop => stop.id !== stopId));
  };

  // Handle stop name input change with debouncing
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newStopName.trim()) {
        searchStopSuggestions(newStopName);
      } else {
        setStopSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [newStopName, searchStopSuggestions]);

  // Auto-scroll to grocery/food section when route planning is complete (start, destination, and departure time filled)
  React.useEffect(() => {
    if (selectedStartLocation && selectedDestination && departureTime) {
      const groceryFoodSection = document.getElementById('grocery-food-section');
      if (groceryFoodSection) {
        setTimeout(() => {
          groceryFoodSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 500);
      }
    }
  }, [selectedStartLocation, selectedDestination, departureTime]);

  return (
    <>
      {GOOGLE_MAPS_API_KEY && (
        <Script
          id="google-maps-places-script-home"
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMapCallbackForHome`}
          strategy="afterInteractive"
          async
          defer
        />
      )}
      
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-20">
          <div className="flex items-center justify-between">
          <div className="flex items-center">
              <Store className="h-6 w-6 text-primary-foreground mr-2" />
              <span className="font-bold text-lg">Thru</span>
                </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium">No waiting, just pickup & go!</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hover:bg-primary/80" onClick={() => router.push('/login')}>
                <Home className="h-5 w-5" />
              </Button>
          </div>
        </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

          {/* Route Selection */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Plan Your Route</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="startLocation" className="block text-sm font-medium mb-1">Start Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                  <Input
                    id="startLocation"
                    ref={startInputRef}
                    type="text"
                    placeholder="Search or use current location"
                    value={startLocationQuery}
                    onChange={(e) => setStartLocationQuery(e.target.value)}
                    className="pl-10"
                    disabled={!isGoogleMapsScriptLoaded && !!GOOGLE_MAPS_API_KEY}
                  />
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs mt-1 text-accent"
                  onClick={handleUseCurrentLocation}
                  disabled={isFetchingCurrentLocation}
                >
                  <LocateFixed className="mr-1 h-3 w-3"/>
                  {isFetchingCurrentLocation ? "Fetching..." : "Use current location"}
                </Button>
        </div>

              <div>
                <Label htmlFor="destination" className="block text-sm font-medium mb-1">Destination</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Input
                      id="destination"
                      ref={destinationInputRef}
                      type="text"
                      placeholder="Where are you heading?"
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      className="pl-10"
                      disabled={!isGoogleMapsScriptLoaded && !!GOOGLE_MAPS_API_KEY}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-2 border-background hover:bg-muted flex-shrink-0"
                    onClick={handleSwapLocations}
                  >
                    <ArrowRightLeft className="h-5 w-5 text-primary"/>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="detour-slider" className="text-sm font-medium">Max Detour: {maxDetourKm} km</Label>
              <input
                id="detour-slider"
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={maxDetourKm}
                onChange={(e) => setMaxDetourKm(parseFloat(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            {/* Add Stops Button */}
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => setShowAddStop(true)}
                className="flex items-center space-x-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Stops</span>
              </Button>
            </div>
          </Card>

          {/* Add Stops Dialog */}
          <Dialog open={showAddStop} onOpenChange={setShowAddStop}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Route Stops</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stop-name" className="text-sm font-medium">Search for a place</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="stop-name"
                      placeholder="Search for places, landmarks, or addresses..."
                      value={newStopName}
                      onChange={(e) => setNewStopName(e.target.value)}
                      className="pl-10"
                    />
                    {isLoadingSuggestions && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Google Places Suggestions */}
                  {stopSuggestions.length > 0 && (
                    <div className="border rounded-lg bg-background shadow-sm mt-2 max-h-48 overflow-y-auto">
                      <div className="p-2 text-sm font-medium text-muted-foreground border-b">
                        Google Places Suggestions
                      </div>
                      {stopSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.place_id}
                          className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => addRouteStop(suggestion)}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{suggestion.description}</p>
              </div>
                          <Button size="sm" variant="outline">
                            Add
                          </Button>
            </div>
                      ))}
                    </div>
                  )}
          </div>

              <div>
                  <Label className="text-sm font-medium">Stop Type</Label>
                  <div className="flex space-x-2 mt-1">
                    {[
                      { value: 'grocery', label: 'Grocery', icon: Store },
                      { value: 'food', label: 'Food', icon: Utensils },
                      { value: 'other', label: 'Other', icon: MapPin }
                    ].map((type) => (
                      <Button
                        key={type.value}
                        variant={newStopType === type.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewStopType(type.value as 'grocery' | 'food' | 'other')}
                        className="flex items-center space-x-1"
                      >
                        <type.icon className="h-3 w-3" />
                        <span>{type.label}</span>
                      </Button>
                    ))}
              </div>
            </div>
                
                <div className="flex space-x-2">
                  <Button onClick={() => addRouteStop()} disabled={!newStopName.trim()}>
                    Add Stop
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddStop(false);
                    setNewStopName("");
                    setStopSuggestions([]);
                  }}>
                    Cancel
                  </Button>
          </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Route Stops List - Show only if there are stops */}
          {routeStops.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Stops ({routeStops.length})</h3>
                <Button
                  variant="outline"
                  size="sm" 
                  onClick={() => setShowAddStop(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add More
                </Button>
              </div>
              
              <div className="space-y-2">
                {routeStops.map((stop) => (
                  <div key={stop.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      {stop.type === 'grocery' && <Store className="h-4 w-4 text-green-600" />}
                      {stop.type === 'food' && <Utensils className="h-4 w-4 text-orange-600" />}
                      {stop.type === 'other' && <MapPin className="h-4 w-4 text-blue-600" />}
                      <span className="font-medium">{stop.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {stop.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRouteStop(stop.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Departure Time Selection */}
          <Card id="departure-time-section" className="p-4">
            <h3 className="text-lg font-semibold mb-4">When are you leaving?</h3>
            <div className="space-y-4">
              {/* Immediate checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediate-checkbox"
                  checked={isImmediate}
                  onCheckedChange={handleImmediateChange}
                />
                <Label htmlFor="immediate-checkbox" className="text-sm font-medium">
                  Leave immediately
                </Label>
              </div>

              {/* Time selection options */}
              {!isImmediate && (
                <div className="space-y-4">
                  {/* Clock picker button */}
                  <div>
                    <Label className="block text-sm font-medium mb-2">Select Time</Label>
                    <Dialog open={showTimePicker} onOpenChange={setShowTimePicker}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Clock className="mr-2 h-4 w-4" />
                          {departureTime ? formatISTTimeOnly(departureTime) : "Choose time"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Select Time</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-4 gap-2 p-4">
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return Array.from({ length: 4 }, (_, j) => {
                              const minute = (j * 15).toString().padStart(2, '0');
                              const time = `${hour}:${minute}`;
                      return (
                                <Button
                                  key={time}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTimeSelect(time)}
                                  className="text-xs"
                                >
                                  {time}
                                </Button>
                              );
                            });
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Quick time options */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {quickTimeOptions.map((option) => (
                        <Button
                          key={option.label}
                          variant="outline"
                          size="sm"
                          onClick={() => setDepartureTime(option.value())}
                          className="text-xs"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Add for later button */}
                  <div>
                    <Dialog open={showDateTimePicker} onOpenChange={setShowDateTimePicker}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Calendar className="mr-2 h-4 w-4" />
                          Add for later
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Schedule for Later</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="date-picker" className="block text-sm font-medium mb-1">
                              Date
                            </Label>
                            <Input
                              id="date-picker"
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <Label htmlFor="time-picker" className="block text-sm font-medium mb-1">
                              Time
                            </Label>
                            <Input
                              id="time-picker"
                              type="time"
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={handleDateTimeSelect}
                            disabled={!selectedDate || !selectedTime}
                            className="w-full"
                          >
                            Set Departure Time
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* Selected time display */}
              {departureTime && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Departure: {formatISTTime(departureTime)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This helps us calculate the best route and timing for your stops.
              </p>
            </div>
          </Card>

          {/* Category Selection */}
          <Card id="category-selection" className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">What do you need?</h2>
              {selectedStartLocation && selectedDestination && departureTime && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Route planned!</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                          <Card 
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    selectedCategories.includes("grocery") ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted"
                  )}
                  onClick={() => handleCategoryToggle("grocery")}
                >
                  <div className="flex flex-col items-center text-center">
                    <Store className="h-8 w-8 text-primary mb-2" />
                    <span className="font-medium">Grocery</span>
                    <span className="text-xs text-muted-foreground">Fresh produce, essentials</span>
                            </div>
                          </Card>

                <Card
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    selectedCategories.includes("food") ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted"
                  )}
                  onClick={() => handleCategoryToggle("food")}
                >
                  <div className="flex flex-col items-center text-center">
                    <Utensils className="h-8 w-8 text-primary mb-2" />
                    <span className="font-medium">Food</span>
                    <span className="text-xs text-muted-foreground">Restaurants, cafes, bakeries</span>
                        </div>
              </Card>
                  </div>
            </Card>

            {/* Tabs for Grocery and Food */}
            <div id="grocery-food-section">
              {selectedCategories.length > 0 ? (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "grocery" | "food" | "vendor-request")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="grocery" disabled={!selectedCategories.includes("grocery")}>
                    <Store className="h-4 w-4 mr-2" />
                    Grocery
                  </TabsTrigger>
                  <TabsTrigger value="food" disabled={!selectedCategories.includes("food")}>
                    <Utensils className="h-4 w-4 mr-2" />
                    Food
                  </TabsTrigger>
                  <TabsTrigger value="vendor-request">
                    <Package className="h-4 w-4 mr-2" />
                    Vendor Request
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="grocery" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Add Grocery Items</h3>
                    <p className="text-muted-foreground mb-4">
                      Enter what you want to buy - we'll bring you best prices from vendors on the way
                    </p>

                    {/* Enhanced Grocery Search */}
                    <EnhancedGrocerySearch 
                      onItemAdd={(item) => {
                        const newItem = {
                          id: `grocery_${Date.now()}`,
                          name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          selectedQuantity: item.quantity
                        };
                        setGroceryItems(prev => [...prev, newItem]);
                      }}
                      className="mb-4"
                    />

                    {/* Grocery Items List */}
                    {groceryItems.length > 0 ? (
                      <div className="mt-6 space-y-3">
                        <h4 className="font-medium">Your Grocery List ({groceryItems.length} items)</h4>
                        {groceryItems.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium">{item.name}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} {item.unit}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateGroceryQuantity(item.id, -1)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateGroceryQuantity(item.id, 1)}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeGroceryItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        
                        {/* Complete Order Button */}
                        <div className="mt-4 pt-4 border-t">
                          <Button 
                            onClick={trackOrderCompletion}
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Complete Order & Track Patterns
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            This helps us learn your preferences for better recommendations
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No items added yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Search for items or add custom items to get started
                        </p>
                      </div>
                    )}
                            </Card>
                </TabsContent>

                <TabsContent value="food" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Food & Dining</h3>
                    <p className="text-muted-foreground mb-4">
                      Discover restaurants, cafes, and food outlets along your route.
                    </p>

                    {/* Toggles */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="on-the-way-toggle" className="text-sm font-medium">On the way</Label>
                          <Switch
                            id="on-the-way-toggle"
                            checked={showAllFood}
                            onCheckedChange={setShowAllFood}
                          />
                          <Label htmlFor="on-the-way-toggle" className="text-sm">Show all</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Label htmlFor="veg-only-toggle" className="text-sm font-medium">Veg Only</Label>
                          <Switch
                            id="veg-only-toggle"
                            checked={showVegOnly}
                            onCheckedChange={setShowVegOnly}
                          />
                        </div>
                      </div>

                      {/* Rating Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Filter by Rating</Label>
                        <div className="flex space-x-2">
                          {[
                            { value: "all", label: "All" },
                            { value: "top-rated", label: "Top Rated" },
                            { value: "new", label: "New" }
                          ].map((option) => (
                            <Button
                              key={option.value}
                              variant={ratingFilter === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setRatingFilter(option.value as "all" | "top-rated" | "new")}
                            >
                              {option.label}
                            </Button>
                ))}
              </div>
            </div>
          </div>

                    {/* Filters */}
                    <div className="space-y-4 mb-6">
                      <h4 className="font-medium">Filters</h4>

                      {/* Cuisine Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cuisine</Label>
                        <div className="flex flex-wrap gap-2">
                          {cuisineOptions.map((cuisine) => (
                            <Button
                              key={cuisine}
                              variant={cuisineFilter === cuisine ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCuisineFilter(cuisine)}
                            >
                              {cuisine === "all" ? "All Cuisines" : cuisine}
                            </Button>
                          ))}
        </div>
      </div>

                      {/* Cost Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cost for 2</Label>
                        <div className="flex flex-wrap gap-2">
                          {costOptions.map((option) => (
                  <Button
                              key={option.value}
                              variant={costFilter === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCostFilter(option.value)}
                            >
                              {option.label}
                  </Button>
                          ))}
                        </div>
                </div>

                      {/* Prep Time Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Prep Time</Label>
                        <div className="flex flex-wrap gap-2">
                          {prepTimeOptions.map((option) => (
                            <Button
                              key={option.value}
                              variant={prepTimeFilter === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPrepTimeFilter(option.value)}
                            >
                              {option.label}
                            </Button>
                  ))}
                </div>
              </div>
            </div>

                    {/* Filter Summary */}
                    <div className="p-3 bg-muted rounded-lg">
                      <h5 className="font-medium mb-2">Active Filters:</h5>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {!showAllFood && <span className="px-2 py-1 bg-primary/10 text-primary rounded">On the way only</span>}
                        {showVegOnly && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Vegetarian only</span>}
                        {ratingFilter !== "all" && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">{ratingFilter === "top-rated" ? "Top Rated" : "New"}</span>}
                        {cuisineFilter !== "all" && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{cuisineFilter}</span>}
                        {costFilter !== "all" && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{costOptions.find(c => c.value === costFilter)?.label}</span>}
                        {prepTimeFilter !== "all" && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">{prepTimeOptions.find(p => p.value === prepTimeFilter)?.label}</span>}
                      </div>
                    </div>

                    {/* Food Shop Results */}
                    {loadingFoodShops ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                        <p className="text-muted-foreground">Discovering food shops along your route...</p>
                      </div>
                    ) : foodShops.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Found {foodShops.length} Food Outlets</h4>
                          <Button variant="outline" size="sm" onClick={loadFoodShops}>
                            <Search className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                        {foodShops.map((shop, index) => (
                          <Card key={shop.id || index} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-semibold text-lg">{shop.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {shop.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {shop.address}
                                </p>
                                {shop.detourDistance && (
                                  <p className="text-xs text-muted-foreground">
                                    📍 {shop.detourDistance.toFixed(1)} km detour
                                  </p>
                                )}
                                {shop.rating && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <span className="text-yellow-500">⭐</span>
                                    <span className="text-sm font-medium">{shop.rating}</span>
                                  </div>
                                )}
                              </div>
                              <Button size="sm" className="ml-4">
                                <Utensils className="h-4 w-4 mr-2" />
                                View Menu
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        {selectedStartLocation && selectedDestination ? (
                          <>
                            <p className="text-muted-foreground">No food outlets found along your route</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Try adjusting your route or increasing the detour distance
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={loadFoodShops}
                              className="mt-4"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search Again
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground">Plan your route first</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Enter your start location and destination above to discover food options along your way
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="vendor-request" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Vendor Request System</h3>
                    <p className="text-muted-foreground mb-4">
                      Send structured requests to nearby vendors with exact quantities and get competitive offers.
                    </p>

                    {!showVendorOffers ? (
                      <StructuredQuantityInput
                        onRequestSubmit={handleVendorRequestSubmit}
                        userLocation={{ lat: 12.97, lng: 77.59 }}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Vendor Offers</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setShowVendorOffers(false);
                              setCurrentRequestId(null);
                            }}
                          >
                            New Request
                          </Button>
                        </div>
                        
                        {currentRequestId && (
                          <VendorOffersDisplay
                            requestId={currentRequestId}
                            onOrderAccept={handleVendorOfferAccept}
                          />
                        )}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
              ) : (
                <Card className="p-4">
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <Store className="h-8 w-8 text-muted-foreground" />
                      <Utensils className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Shop?</h3>
                    <p className="text-muted-foreground mb-4">
                      Select grocery or food categories above to start adding items to your route.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button 
                        variant="outline" 
                        onClick={() => handleCategoryToggle("grocery")}
                        className="flex items-center space-x-2"
                      >
                        <Store className="h-4 w-4" />
                        <span>Add Grocery</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleCategoryToggle("food")}
                        className="flex items-center space-x-2"
                      >
                        <Utensils className="h-4 w-4" />
                        <span>Add Food</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Proceed Button */}
            {canProceed && (
              <Card className="p-4">
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base"
                  onClick={() => {
                    toast({
                      title: "Route Planned!",
                      description: "Your route has been planned successfully. Features coming soon!",
                    });
                  }}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Plan Route & Continue
                </Button>
              </Card>
            )}
          </main>

      <BottomNav />
    </div>
      </>
    );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
