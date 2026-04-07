"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import Image from "next/image";
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
  Package,
  Plus,
  Minus
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
import { routeBasedShopDiscovery, RoutePoint } from "@/lib/route-based-shop-discovery";
import { useFoodCart } from "@/hooks/useFoodCart";
import { getShopStatus, getTodayHours } from "@/utils/operating-hours";

function HomePageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { items: cartItems, addToCart, updateQuantity } = useFoodCart();

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

  // Menu states
  const [selectedShopMenu, setSelectedShopMenu] = React.useState<any>(null);
  const [menuItems, setMenuItems] = React.useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = React.useState(false);
  const [showMenuDialog, setShowMenuDialog] = React.useState(false);

  // Google Maps states
  const [isGoogleMapsScriptLoaded, setIsGoogleMapsScriptLoaded] = React.useState(false);
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = React.useState(false);
  // Force legacy autocomplete for reliable styling/value control in production.
  const [forceLegacyAutocomplete, setForceLegacyAutocomplete] = React.useState(true);

  const startInputRef = React.useRef<HTMLInputElement>(null);
  const destinationInputRef = React.useRef<HTMLInputElement>(null);
  const startAutocompleteContainerRef = React.useRef<HTMLDivElement>(null);
  const destAutocompleteContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Initialize autocomplete - Robust with hard state-based fallback
  React.useEffect(() => {
    if (!isGoogleMapsScriptLoaded || !GOOGLE_MAPS_API_KEY) return;

    const initAutocomplete = async () => {
      const googleObj = (window as any).google;
      
      if (forceLegacyAutocomplete) {
        setupLegacyStart();
        setupLegacyDest();
        return;
      }

      try {
        const { PlaceAutocompleteElement } = await googleObj.maps.importLibrary("places");
        
        // Setup Start
        if (startAutocompleteContainerRef.current) {
          const startEl = new PlaceAutocompleteElement();
          startAutocompleteContainerRef.current.innerHTML = '';
          startAutocompleteContainerRef.current.appendChild(startEl);
          
          startEl.addEventListener('gmp-error', () => setForceLegacyAutocomplete(true));
          startEl.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;
            if (place) {
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
              const coordString = `${place.location.lat()}, ${place.location.lng()}`;
              setSelectedStartLocation(coordString);
              setStartLocationQuery(place.formattedAddress || place.displayName || coordString);
            }
          });
        }

        // Setup Dest
        if (destAutocompleteContainerRef.current) {
          const destEl = new PlaceAutocompleteElement();
          destAutocompleteContainerRef.current.innerHTML = '';
          destAutocompleteContainerRef.current.appendChild(destEl);
          
          destEl.addEventListener('gmp-error', () => setForceLegacyAutocomplete(true));
          destEl.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;
            if (place) {
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
              const coordString = `${place.location.lat()}, ${place.location.lng()}`;
              setSelectedDestination(coordString);
              setDestinationQuery(place.formattedAddress || place.displayName || coordString);
            }
          });
        }

      } catch (e) {
        console.warn('New Places API failed, using legacy fallback');
        setForceLegacyAutocomplete(true);
      }
    };

    const setupLegacyStart = () => {
      const googleObj = (window as any).google;
      if (!startAutocompleteContainerRef.current || startAutocompleteContainerRef.current.querySelector('#legacy-start-home')) return;
      
      // Add extra left padding (pl-9) to avoid overlapping left icon
      startAutocompleteContainerRef.current.innerHTML = '<input id="legacy-start-home" class="flex h-10 w-full rounded-md border border-input bg-background text-foreground pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter start location" />';
      const input = document.getElementById('legacy-start-home') as HTMLInputElement;
      const autocomplete = new googleObj.maps.places.Autocomplete(input, { fields: ['formatted_address', 'geometry'] });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          const coordString = `${place.geometry.location.lat()}, ${place.geometry.location.lng()}`;
          setSelectedStartLocation(coordString);
          setStartLocationQuery(place.formatted_address || coordString);
        }
      });
    };

    const setupLegacyDest = () => {
      const googleObj = (window as any).google;
      if (!destAutocompleteContainerRef.current || destAutocompleteContainerRef.current.querySelector('#legacy-dest-home')) return;

      // Add extra left padding (pl-9) to avoid overlapping left icon
      destAutocompleteContainerRef.current.innerHTML = '<input id="legacy-dest-home" class="flex h-10 w-full rounded-md border border-input bg-background text-foreground pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter destination address" />';
      const input = document.getElementById('legacy-dest-home') as HTMLInputElement;
      const autocomplete = new googleObj.maps.places.Autocomplete(input, { fields: ['formatted_address', 'geometry'] });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          const coordString = `${place.geometry.location.lat()}, ${place.geometry.location.lng()}`;
          setSelectedDestination(coordString);
          setDestinationQuery(place.formatted_address || coordString);
        }
      });
    };

    initAutocomplete();
  }, [isGoogleMapsScriptLoaded, GOOGLE_MAPS_API_KEY, forceLegacyAutocomplete]);

  // Keep legacy inputs in sync with state values.
  React.useEffect(() => {
    const startEl = document.getElementById('legacy-start-home') as HTMLInputElement | null;
    if (startEl && startLocationQuery && startEl.value !== startLocationQuery) {
      startEl.value = startLocationQuery;
    }
    const destEl = document.getElementById('legacy-dest-home') as HTMLInputElement | null;
    if (destEl && destinationQuery && destEl.value !== destinationQuery) {
      destEl.value = destinationQuery;
    }
  }, [startLocationQuery, destinationQuery, forceLegacyAutocomplete]);

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
        const coordString = `${latitude}, ${longitude}`;
        
        console.log('📍 Current location coordinates:', coordString);
        
        // ALWAYS store coordinates in selectedStartLocation
        setSelectedStartLocation(coordString);
        // Force legacy input mode so we can reflect the value visibly even when
        // the new PlaceAutocompleteElement doesn't expose a controllable value prop.
        setForceLegacyAutocomplete(true);
        
        // Try to get place name using reverse geocoding for DISPLAY ONLY
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
              setStartLocationQuery(placeName); // Show readable name
              console.log('✅ Current location display name:', placeName);
              setTimeout(() => {
                const el = document.getElementById('legacy-start-home') as HTMLInputElement | null;
                if (el) el.value = placeName;
              }, 0);
            } else {
              // Show coordinates if geocoding fails
              setStartLocationQuery(coordString);
              setTimeout(() => {
                const el = document.getElementById('legacy-start-home') as HTMLInputElement | null;
                if (el) el.value = coordString;
              }, 0);
            }
          } catch (error) {
            console.error("Error with reverse geocoding:", error);
            // Show coordinates if geocoding fails
            setStartLocationQuery(coordString);
            setTimeout(() => {
              const el = document.getElementById('legacy-start-home') as HTMLInputElement | null;
              if (el) el.value = coordString;
            }, 0);
          }
        } else {
          // Show coordinates if Google Maps not loaded
          setStartLocationQuery(coordString);
          setTimeout(() => {
            const el = document.getElementById('legacy-start-home') as HTMLInputElement | null;
            if (el) el.value = coordString;
          }, 0);
        }
        
        setIsFetchingCurrentLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        const errorMessage =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Please allow location access in browser settings."
            : error.code === error.POSITION_UNAVAILABLE
            ? "Location information is unavailable right now. Try again in a moment."
            : error.code === error.TIMEOUT
            ? "Location request timed out. Please retry."
            : "Please allow location access or enter manually.";
        toast({
          title: "Location access denied",
          description: errorMessage,
          variant: "destructive",
        });
        setIsFetchingCurrentLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
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

  // Get place details for selected suggestion OR parse coordinates OR plain address
  const getPlaceDetails = React.useCallback(async (placeIdOrCoords: string) => {
    // ✅ Check if it's coordinates in format "lat, lng"
    const coordsMatch = placeIdOrCoords.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      console.log('✅ Parsed coordinates:', { lat, lng });
      return {
        name: `Location at ${lat}, ${lng}`,
        address: `${lat}, ${lng}`,
        coordinates: { lat, lng }
      };
    }
    
    // ✅ Otherwise, resolve as Place ID first, then fallback to address geocoding
    if (!window.google?.maps?.places) {
      console.warn('⚠️ Google Maps not loaded, cannot get place details');
      return null;
    }
    
    return new Promise((resolve) => {
      const isLikelyPlaceId = /^ChI[A-Za-z0-9_-]+$/.test(placeIdOrCoords.trim());
      const finishWithAddressGeocode = () => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: placeIdOrCoords }, (results, status) => {
          if (status === 'OK' && results && results[0]?.geometry?.location) {
            resolve({
              name: results[0].formatted_address || placeIdOrCoords,
              address: results[0].formatted_address || placeIdOrCoords,
              coordinates: {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              },
            });
          } else {
            resolve(null);
          }
        });
      };

      if (!isLikelyPlaceId) {
        // Plain address/path text - geocode directly
        finishWithAddressGeocode();
        return;
      }

      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        placeId: placeIdOrCoords,
        fields: ['name', 'formatted_address', 'geometry']
      };

      service.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          resolve({
            name: place.name || '',
            address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }
          });
        } else {
          // Place ID lookup failed - fallback to address geocoding
          finishWithAddressGeocode();
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
      console.warn('⚠️ No start or destination selected');
      return;
    }

    setLoadingFoodShops(true);
    try {
      console.log('🔍 Loading food shops...');
      console.log('  Start location string:', selectedStartLocation);
      console.log('  Destination string:', selectedDestination);
      
      // ✅ Flexible coordinate parsing - handles multiple formats
      const parseCoords = (str: string): { coordinates: { lat: number; lng: number }; address: string } | null => {
        console.log('    Trying to parse:', str);
        
        // Try standard format: "18.475, 73.860"
        let match = str.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (match) {
          console.log('    ✅ Matched standard format');
          return {
            coordinates: {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2])
            },
            address: str
          };
        }
        
        // Try format without space: "18.475,73.860"
        match = str.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
        if (match) {
          console.log('    ✅ Matched no-space format');
          return {
            coordinates: {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2])
            },
            address: str
          };
        }
        
        console.log('    ❌ Not a coordinate format');
        return null;
      };
      
      let startDetails: { coordinates: { lat: number; lng: number }; address: string } | null = parseCoords(selectedStartLocation);
      let destDetails: { coordinates: { lat: number; lng: number }; address: string } | null = parseCoords(selectedDestination);
      
      // ✅ If not coordinates, try Google Places API
      if (!startDetails) {
        console.log('  📍 Not coordinates, trying Google Places API for start...');
        const placeDetails = await getPlaceDetails(selectedStartLocation);
        if (placeDetails) {
          startDetails = placeDetails as { coordinates: { lat: number; lng: number }; address: string };
          console.log('  ✅ Got start coordinates from Google:', startDetails.coordinates);
        }
      } else {
        console.log('  ✅ Parsed start coordinates directly:', startDetails.coordinates);
      }
      
      if (!destDetails) {
        console.log('  📍 Not coordinates, trying Google Places API for destination...');
        const placeDetails = await getPlaceDetails(selectedDestination);
        if (placeDetails) {
          destDetails = placeDetails as { coordinates: { lat: number; lng: number }; address: string };
          console.log('  ✅ Got destination coordinates from Google:', destDetails.coordinates);
        }
      } else {
        console.log('  ✅ Parsed destination coordinates directly:', destDetails.coordinates);
      }

      if (!startDetails || !destDetails) {
        console.error('❌ Could not get place details');
        toast({
          title: "Location Error",
          description: "Could not parse locations. Try format: 18.475, 73.860",
          variant: "destructive",
        });
        return;
      }

      const startCoords = (startDetails as any).coordinates;
      const destCoords = (destDetails as any).coordinates;
      const startAddress = (startDetails as any).address || startLocationQuery;
      const destAddress = (destDetails as any).address || destinationQuery;

      console.log('🍽️ Finding food shops along route:', { startCoords, destCoords });

      // Use route-based shop discovery to find food shops
      const result = await routeBasedShopDiscovery.findShopsAlongRoute(
        { latitude: startCoords.lat, longitude: startCoords.lng, address: startAddress },
        { latitude: destCoords.lat, longitude: destCoords.lng, address: destAddress },
        maxDetourKm,
        ['restaurant', 'cafe', 'cloud_kitchen', 'bakery', 'fast_food', 'fine_dining', 'food_truck', 'coffee_shop', 'bar', 'pub'] as any
      );

      console.log(`✅ Found ${result.shops.length} food shops`);
      setFoodShops(result.shops);

      if (result.shops.length > 0) {
        toast({
          title: "Food Shops Found!",
          description: `Discovered ${result.shops.length} food outlet${result.shops.length > 1 ? 's' : ''} along your route.`,
        });
      } else {
        toast({
          title: "No Shops Found",
          description: "Try increasing the detour distance or adjusting your route.",
        });
      }
    } catch (error) {
      console.error('❌ Error loading food shops:', error);
      toast({
        title: "Error",
        description: "Could not load food shops. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingFoodShops(false);
    }
  }, [selectedStartLocation, selectedDestination, startLocationQuery, destinationQuery, maxDetourKm, toast]);

  // Load menu for a shop
  const loadShopMenu = React.useCallback(async (shop: any) => {
    setSelectedShopMenu(shop);
    setLoadingMenu(true);
    setShowMenuDialog(true);
    
    try {
      const response = await fetch(`/api/menu/${shop.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setMenuItems(data.items || []);
        if (data.items.length === 0) {
          toast({
            title: "No Menu Yet",
            description: `${shop.name} hasn't uploaded their menu yet.`,
          });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      toast({
        title: "Error",
        description: "Failed to load menu. Please try again.",
        variant: "destructive",
      });
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [toast]);

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

  // Keep functionality intact: Automatically fetch user location on start if Maps API is loaded
  React.useEffect(() => {
    if (isGoogleMapsScriptLoaded && !selectedStartLocation && !isFetchingCurrentLocation && !startLocationQuery) {
      handleUseCurrentLocation();
      
      // Auto-set as leaving now for less friction
      if (!isImmediate && !departureTime) {
        handleImmediateChange(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleMapsScriptLoaded]);

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

          {/* Unified Route & Planning Card */}
          <div className="relative mb-6">
            <Card className="p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-primary/10 overflow-hidden transform transition-all duration-300">
              <div className="space-y-6">
                
                {/* Where to section */}
                <div className="relative pl-8 space-y-4">
                  {/* Vertical connector line */}
                  <div className="absolute left-[15px] top-[24px] bottom-[24px] w-[2px] bg-muted/60 rounded-full"></div>
                  
                  {/* Start Location */}
                  <div className="relative">
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_0_4px_rgba(246,103,94,0.15)]"></div>
                    </div>
                    <div ref={startAutocompleteContainerRef} className="w-full" />
                    {(!selectedStartLocation) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <LocateFixed className={cn("h-4 w-4 text-primary", isFetchingCurrentLocation ? "animate-pulse" : "")}/>
                      </div>
                    )}
                  </div>

                  {/* Destination Location */}
                  <div className="relative">
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-accent z-20" />
                    </div>
                    <div ref={destAutocompleteContainerRef} className="w-full" />
                  </div>
                  
                  {/* Swap Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -left-[30px] top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-sm z-10 border border-background hover:bg-muted bg-background text-muted-foreground transition-all hover:rotate-180"
                    onClick={handleSwapLocations}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 rotate-90"/>
                  </Button>
                </div>

                {/* Compact Row: Departure Time, Immediate Toggle, Stops */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  {/* Time Setting */}
                  <Dialog open={showTimePicker} onOpenChange={setShowTimePicker}>
                    <DialogTrigger asChild>
                      <Button 
                        variant={isImmediate ? "outline" : "default"} 
                        className={cn(
                          "flex-1 transition-all h-10 px-3 font-medium justify-start",
                          isImmediate ? "bg-muted/50 text-muted-foreground" : "bg-primary text-primary-foreground shadow-sm"
                        )}
                        onClick={(e) => { 
                          if (isImmediate) { 
                            e.preventDefault(); 
                            handleImmediateChange(false); 
                          }
                        }}
                      >
                        <Clock className={cn("mr-2 h-4 w-4", isImmediate ? "text-muted-foreground" : "text-primary-foreground")} />
                        {isImmediate ? "Leaving Now" : (departureTime ? formatISTTimeOnly(departureTime) : "Set Time")}
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

                  {/* Immediate Toggle */}
                  <div 
                    className={cn(
                      "flex items-center space-x-2 border rounded-md px-3 h-10 cursor-pointer transition-colors shadow-sm",
                      isImmediate ? "bg-primary/10 border-primary/30" : "bg-background border-border hover:bg-muted"
                    )}
                    onClick={() => handleImmediateChange(!isImmediate)}
                  >
                    <Checkbox
                      id="immediate-checkbox-mini"
                      checked={isImmediate}
                      onCheckedChange={handleImmediateChange}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="immediate-checkbox-mini" className="text-sm font-medium cursor-pointer">Now</Label>
                  </div>

                  {/* Add Stops Toggle */}
                  <Dialog open={showAddStop} onOpenChange={setShowAddStop}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-background shadow-sm hover:bg-muted">
                        <PlusCircle className="h-4 w-4 text-primary" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Route Stops</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="stop-name" className="text-sm font-medium">Search for a place</Label>
                          <div className="relative mt-1.5">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="stop-name"
                              placeholder="Search for places..."
                              value={newStopName}
                              onChange={(e) => setNewStopName(e.target.value)}
                              className="pl-9"
                            />
                            {isLoadingSuggestions && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {stopSuggestions.length > 0 && (
                            <div className="border rounded-lg bg-background shadow-sm mt-2 max-h-48 overflow-y-auto">
                              {stopSuggestions.map((suggestion) => (
                                <div
                                  key={suggestion.place_id}
                                  className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                  onClick={() => addRouteStop(suggestion)}
                                >
                                  <p className="font-medium flex-1 text-sm truncate mr-2">{suggestion.description}</p>
                                  <Button size="sm" variant="outline">Add</Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Stop Type</Label>
                          <div className="flex space-x-2 mt-1.5">
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
                        <div className="flex space-x-2 pt-2">
                          <Button onClick={() => addRouteStop()} disabled={!newStopName.trim()} className="w-full">Add Stop</Button>
                          <Button variant="outline" onClick={() => { setShowAddStop(false); setNewStopName(""); setStopSuggestions([]); }} className="w-full">Cancel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Sub-settings: Detour slider */}
                <div className="px-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="detour-slider" className="text-xs text-muted-foreground font-medium flex items-center">
                      <MapPin className="h-3 w-3 mr-1 opacity-70"/> Max Detour: {maxDetourKm} km
                    </Label>
                  </div>
                  <input
                    id="detour-slider"
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={maxDetourKm}
                    onChange={(e) => setMaxDetourKm(parseFloat(e.target.value))}
                    className="w-full mt-2 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Route Stops List - Inline */}
                {routeStops.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Added Stops ({routeStops.length})</h4>
                    {routeStops.map((stop) => (
                      <div key={stop.id} className="flex items-center justify-between bg-background p-2 rounded-md shadow-sm border border-border/40">
                        <div className="flex items-center space-x-2 truncate pr-2">
                          {stop.type === 'grocery' && <Store className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          {stop.type === 'food' && <Utensils className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                          {stop.type === 'other' && <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                          <span className="font-medium text-sm truncate">{stop.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeRouteStop(stop.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Category Selector */}
                <div className="pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">What do you need?</Label>
                    {selectedStartLocation && selectedDestination && departureTime && (
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-green-700 bg-green-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Route planned</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={cn(
                        "p-3 rounded-xl border-[1.5px] cursor-pointer transition-all flex items-center gap-3",
                        selectedCategories.includes("grocery") 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                      )}
                      onClick={() => handleCategoryToggle("grocery")}
                    >
                      <div className={cn("p-2 rounded-lg transition-colors", selectedCategories.includes("grocery") ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground shadow-sm")}>
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Grocery</div>
                      </div>
                    </div>

                    <div 
                      className={cn(
                        "p-3 rounded-xl border-[1.5px] cursor-pointer transition-all flex items-center gap-3",
                        selectedCategories.includes("food") 
                          ? "border-accent bg-accent/5 shadow-sm" 
                          : "border-border/60 bg-muted/20 hover:border-accent/40 hover:bg-muted/40"
                      )}
                      onClick={() => handleCategoryToggle("food")}
                    >
                      <div className={cn("p-2 rounded-lg transition-colors", selectedCategories.includes("food") ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground shadow-sm")}>
                        <Utensils className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Food</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </Card>
          </div>

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
                        {foodShops.map((shop, index) => {
                          const status = getShopStatus(shop.businessHours as any);
                          const closedClass = status.isOpen ? "" : "opacity-60";
                          const nextOpenText = !status.isOpen && status.nextOpenTime ? status.nextOpenTime : undefined;
                          const todayHours = getTodayHours(shop.businessHours as any);
                          return (
                          <Card key={shop.id || index} className={`p-4 hover:shadow-md transition-shadow ${closedClass}`}>
                            <div className="flex items-start gap-4 justify-between">
                              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                <Image
                                  src={
                                    shop.imageUrl ||
                                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='12'>No Image</text></svg>"
                                  }
                                  alt={shop.name || "Shop image"}
                                  width={96}
                                  height={96}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='12'>No Image</text></svg>";
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-semibold text-lg">{shop.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {shop.type}
                                  </Badge>
                                  <Badge variant={status.isOpen ? "default" : "secondary"} className="text-xs">
                                    {status.isOpen ? "Open" : "Closed"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {shop.address}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Hours today: {todayHours}{nextOpenText ? ` • Opens ${nextOpenText}` : ""}
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
                              <Button 
                                size="sm" 
                                className="ml-4"
                                onClick={() => loadShopMenu(shop)}
                              >
                                <Utensils className="h-4 w-4 mr-2" />
                                View Menu
                              </Button>
                            </div>
                          </Card>
                        )})}
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

          {/* Menu Dialog */}
          <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedShopMenu?.name} - Menu</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                {loadingMenu ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">
                      No menu items available yet
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedShopMenu?.name} hasn't uploaded their menu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(
                      menuItems.reduce((acc: any, item: any) => {
                        const category = item.category || 'Other';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(item);
                        return acc;
                      }, {})
                    ).map(([category, items]: [string, any]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background py-2">
                          {category}
                        </h3>
                        <div className="space-y-3">
                          {items.map((item: any) => {
                            const cartItem = cartItems.get(item.id);
                            const quantity = cartItem?.quantity || 0;
                            
                            return (
                              <Card key={item.id} className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold">{item.name}</h4>
                                      {item.is_veg && (
                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                          VEG
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {item.description}
                                      </p>
                                    )}
                                    <p className="text-lg font-bold text-primary">
                                      ₹{item.price}
                                    </p>
                                    {item.preparation_time && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        ⏱️ {item.preparation_time} mins
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-2">
                                    {item.image_url && (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-24 h-24 object-cover rounded-lg"
                                      />
                                    )}
                                    
                                    {quantity === 0 ? (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          addToCart(item, selectedShopMenu!);
                                          toast({
                                            title: "Added to cart",
                                            description: `${item.name} added to your cart`,
                                          });
                                        }}
                                        className="w-full min-w-[100px]">
                                        Add to Cart
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-background rounded-md"
                                          onClick={() => updateQuantity(item.id, quantity - 1)}
                                        >
                                          {quantity === 1 ? (
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          ) : (
                                            <Minus className="h-3 w-3" />
                                          )}
                                        </Button>
                                        <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-background rounded-md"
                                          onClick={() => updateQuantity(item.id, quantity + 1)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Cart Footer */}
              {Array.from(cartItems.values()).length > 0 && (
                <div className="sticky bottom-0 border-t bg-background p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {Array.from(cartItems.values()).reduce((sum, item) => sum + item.quantity, 0)} items
                      </p>
                      <p className="text-lg font-bold">
                        ₹{Array.from(cartItems.values()).reduce((sum, item) => sum + item.totalPrice, 0)}
                      </p>
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => {
                        setShowMenuDialog(false);
                        router.push('/cart');
                      }}
                      className="min-w-[140px]">
                      View Cart
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
