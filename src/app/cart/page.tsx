
"use client";

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  MapPin,
  ShoppingCart,
  Loader2,
  Minus,
  Plus,
  X,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { consumerOrderService } from "@/lib/consumer-order-service";
import { PlacedOrder, VendorOrderPortion } from "@/lib/orderModels";

// Interfaces
interface CartVendorItem {
  itemId: string;
  quantity: number;
  name?: string;
  price?: number;
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
}

interface CartVendorGroup {
  vendorInfo: {
    id: string;
    name: string;
    address?: string;
    type?: string;
  };
  items: CartVendorItem[];
  vendorSubtotal: number;
}

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [cartVendorGroups, setCartVendorGroups] = React.useState<CartVendorGroup[]>([]);
  const [overallSubtotal, setOverallSubtotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("gpay");
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [startLocation, setStartLocation] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);

  // Load cart data
  React.useEffect(() => {
    const loadCart = () => {
      try {
        // Try loading from URL params first (Plan Trip flow)
        const finalItemsStr = searchParams.get("finalItemsForCart");
        const vendorIdsStr = searchParams.get("selectedVendorIds");
        const masterItemsStr = searchParams.get("masterItemsListString");
        const start = searchParams.get("start");
        const dest = searchParams.get("destination");

        if (start) setStartLocation(start);
        if (dest) setDestination(dest);

        if (finalItemsStr && vendorIdsStr && masterItemsStr) {
          const finalItemsByVendor = JSON.parse(finalItemsStr);
          const masterItemsList = JSON.parse(masterItemsStr);
          const masterItemsMap = new Map<string, any>(masterItemsList.map((item: any) => [item.id, item]));
          const vendorIds = vendorIdsStr.split(',');

          const groups: CartVendorGroup[] = [];
          let total = 0;

          vendorIds.forEach((vendorId: string) => {
            const items = finalItemsByVendor[vendorId] || [];
            const displayItems: CartVendorItem[] = [];
            let vendorTotal = 0;

            items.forEach((item: any) => {
              const masterItem = masterItemsMap.get(item.itemId);
              if (masterItem) {
                const price = masterItem.price || 0;
                displayItems.push({
                  itemId: item.itemId,
                  quantity: item.quantity,
                  name: masterItem.name,
                  price: price,
                  imageUrl: masterItem.imageUrl,
                  details: masterItem.details
                });
                vendorTotal += price * item.quantity;
              }
            });

            if (displayItems.length > 0) {
              groups.push({
                vendorInfo: { id: vendorId, name: `Vendor ${vendorId.substring(0,6)}`, type: "Store" }, // Placeholder name if not passed
                items: displayItems,
                vendorSubtotal: vendorTotal
              });
              total += vendorTotal;
            }
          });

          setCartVendorGroups(groups);
          setOverallSubtotal(total);
          setIsLoading(false);
          return;
        }

        // Fallback to localStorage (Food Cart flow)
        const savedCart = localStorage.getItem('food_cart');
        const savedShop = localStorage.getItem('food_cart_shop');

        if (savedCart && savedShop) {
          const parsedCart = JSON.parse(savedCart); // Array of [id, item]
          const shop = JSON.parse(savedShop);
          
          const items: CartVendorItem[] = parsedCart.map(([, cartItem]: [string, any]) => ({
            itemId: cartItem.item.id,
            quantity: cartItem.quantity,
            name: cartItem.item.name,
            price: cartItem.item.price,
            imageUrl: cartItem.item.image_url,
            details: cartItem.item.description
          }));

          const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

          setCartVendorGroups([{
            vendorInfo: shop,
            items,
            vendorSubtotal: subtotal
          }]);
          setOverallSubtotal(subtotal);
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        toast({ title: "Error", description: "Failed to load cart items", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [searchParams, toast]);

  const updateQuantity = (vendorId: string, itemId: string, delta: number) => {
    setCartVendorGroups(prev => {
      const newGroups = prev.map(group => {
        if (group.vendorInfo.id === vendorId) {
          const newItems = group.items.map(item => {
            if (item.itemId === itemId) {
              return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
          }).filter(item => item.quantity > 0);
          
          const newSubtotal = newItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
          return { ...group, items: newItems, vendorSubtotal: newSubtotal };
        }
        return group;
      }).filter(group => group.items.length > 0);

      const newTotal = newGroups.reduce((sum, group) => sum + group.vendorSubtotal, 0);
      setOverallSubtotal(newTotal);
      
      // Update localStorage if using Food Cart flow
      if (!searchParams.get("finalItemsForCart")) {
        if (newGroups.length === 0) {
          localStorage.removeItem('food_cart');
          localStorage.removeItem('food_cart_shop');
        } else {
          // Reconstruct map for localStorage
          const mapEntries = newGroups[0].items.map(item => [
            item.itemId,
            {
              item: { 
                id: item.itemId, 
                name: item.name, 
                price: item.price, 
                image_url: item.imageUrl, 
                description: item.details 
              },
              quantity: item.quantity,
              totalPrice: (item.price || 0) * item.quantity
            }
          ]);
          localStorage.setItem('food_cart', JSON.stringify(mapEntries));
        }
      }

      return newGroups;
    });
  };

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Fetch vendor locations from Supabase
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();
      
      const vendorIds = cartVendorGroups.map(g => g.vendorInfo.id);
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, location')
        .in('id', vendorIds);

      if (vendorsError) {
        console.error('Error fetching vendor locations:', vendorsError);
      }

      // Create a map of vendor locations
      const vendorLocationsMap = new Map<string, { latitude: number; longitude: number }>();
      if (vendorsData) {
        vendorsData.forEach((vendor: any) => {
          if (vendor.location) {
            // Handle both GeoJSON and plain object formats
            if (vendor.location.type === 'Point' && vendor.location.coordinates) {
              // GeoJSON format: [longitude, latitude]
              vendorLocationsMap.set(vendor.id, {
                longitude: vendor.location.coordinates[0],
                latitude: vendor.location.coordinates[1]
              });
            } else if (vendor.location.latitude && vendor.location.longitude) {
              // Plain object format
              vendorLocationsMap.set(vendor.id, {
                latitude: vendor.location.latitude,
                longitude: vendor.location.longitude
              });
            }
          }
        });
      }

      const vendorPortions: VendorOrderPortion[] = cartVendorGroups.map(group => {
        const location = vendorLocationsMap.get(group.vendorInfo.id);
        return {
          vendorId: group.vendorInfo.id,
          vendorName: group.vendorInfo.name,
          vendorAddress: group.vendorInfo.address,
          vendorType: group.vendorInfo.type,
          vendorLocation: location,
          status: "New",
          vendorSubtotal: group.vendorSubtotal,
          items: group.items.map(item => ({
            itemId: item.itemId,
            name: item.name || "Unknown Item",
            quantity: item.quantity,
            pricePerItem: item.price || 0,
            totalPrice: (item.price || 0) * item.quantity,
            imageUrl: item.imageUrl,
            details: item.details
          }))
        };
      });

      const order: PlacedOrder = {
        orderId,
        createdAt: new Date().toISOString(),
        overallStatus: "New",
        paymentStatus: "Paid", // Assuming successful payment
        grandTotal: overallSubtotal,
        platformFee: 0,
        paymentGatewayFee: 0,
        vendorPortions,
        vendorIds: cartVendorGroups.map(g => g.vendorInfo.id),
        tripStartLocation: startLocation || undefined,
        tripDestination: destination || undefined,
        customerInfo: {
          name: "Guest User", // Replace with actual user info
          phoneNumber: "+919876543210"
        }
      };

      // Debug logging to help identify vendor ID mismatch
      console.log("🔍 Order Creation Debug:");
      console.log("Vendor IDs being used:", order.vendorIds);
      console.log("Vendor portions:", vendorPortions.map(v => ({ id: v.vendorId, name: v.vendorName, location: v.vendorLocation })));
      console.log("⚠️ IMPORTANT: These vendor IDs must match the Firebase Auth UIDs of the vendors!");
      
      const result = await consumerOrderService.createOrder(order);

      if (result.success) {
        // Clear cart
        localStorage.removeItem('food_cart');
        localStorage.removeItem('food_cart_shop');
        
        toast({
          title: "Order Placed Successfully!",
          description: `Order #${orderId} has been sent to the vendor.`,
        });
        
        // Redirect to tracking or success page
        // For now, redirect to home or order tracking
        setTimeout(() => {
            router.push(`/order-tracking/${orderId}`);
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Order placement failed:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPlacingOrder(false);
      setIsPaymentOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="bg-background p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">My cart</h1>
      </div>

      <div className="flex-1 p-4 pb-32 space-y-6">
        {/* Trip Card */}
        {destination && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-200/50"></div>
            <p className="text-xs text-muted-foreground mb-1">Trip to</p>
            <h2 className="text-lg font-semibold text-foreground">{destination}</h2>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100 rounded-full opacity-50 blur-xl"></div>
          </div>
        )}

        {cartVendorGroups.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p>Your cart is empty</p>
            <Button variant="link" onClick={() => router.push('/home')}>Go Shopping</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {cartVendorGroups.map(group => (
              <div key={group.vendorInfo.id}>
                <h3 className="text-xs text-muted-foreground mb-4 pl-1">{group.vendorInfo.name}</h3>
                <div className="space-y-6">
                  {group.items.map(item => (
                    <div key={item.itemId} className="flex gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                        <Image 
                          src={item.imageUrl || "https://placehold.co/64x64.png"} 
                          alt={item.name || "Item"} 
                          width={64} 
                          height={64} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.details || "200 gm"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           {/* Black Quantity Buttons */}
                          <div className="flex items-center bg-black text-white rounded-md h-8 px-1">
                            <button 
                              className="w-7 h-full flex items-center justify-center hover:bg-white/10 rounded-l-md transition-colors"
                              onClick={() => updateQuantity(group.vendorInfo.id, item.itemId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button 
                              className="w-7 h-full flex items-center justify-center hover:bg-white/10 rounded-r-md transition-colors"
                              onClick={() => updateQuantity(group.vendorInfo.id, item.itemId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-right">
                             {item.price && (
                              <>
                                <span className="text-[10px] text-muted-foreground line-through block">₹{Math.round(item.price * 1.1)}</span>
                                <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="mt-6" />
              </div>
            ))}
          </div>
        )}

        {/* Pickup Location */}
        <div className="mt-4">
          <h3 className="text-xs text-muted-foreground mb-2">Pickup location</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-foreground" />
              <span className="font-medium text-sm">{startLocation || "Kalyani Nagar, Pune"}</span>
            </div>
            <Button variant="link" className="text-orange-500 h-auto p-0 text-sm font-normal">Change</Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 pl-6">1 KM from your location</p>
        </div>
      </div>

      {/* Bottom Bar */}
      {cartVendorGroups.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-4 pb-8 rounded-t-3xl z-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">₹{overallSubtotal}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">TOTAL</span>
                <div className="text-[10px] bg-[#2A4D46] text-[#4ADE80] px-1.5 py-0.5 rounded">SAVING ₹44</div>
              </div>
            </div>
            <Button 
              className="bg-transparent hover:bg-white/10 text-white border-none text-lg font-medium h-auto p-0"
              onClick={() => setIsPaymentOpen(true)}
            >
              Place Order
            </Button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md p-6 gap-6 bg-white rounded-t-3xl sm:rounded-xl !max-w-none sm:!max-w-md fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full mb-0 pb-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Pay ₹{overallSubtotal}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200" onClick={() => setIsPaymentOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                paymentMethod === "gpay" ? "border-black bg-gray-50" : "border-gray-100"
              )} onClick={() => setPaymentMethod("gpay")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border rounded-full flex items-center justify-center shadow-sm">
                    <span className="font-bold text-blue-500 text-lg">G</span>
                  </div>
                  <span className="font-semibold">GPay UPI</span>
                </div>
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", paymentMethod === "gpay" ? "bg-black border-black" : "border-gray-300")}>
                    {paymentMethod === "gpay" && <Check className="h-3 w-3 text-white" />}
                </div>
                <RadioGroupItem value="gpay" id="gpay" className="sr-only" />
              </div>

              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                paymentMethod === "phonepe" ? "border-black bg-gray-50" : "border-gray-100"
              )} onClick={() => setPaymentMethod("phonepe")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5f259f] rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    Pe
                  </div>
                  <span className="font-semibold">PhonePe UPI</span>
                </div>
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", paymentMethod === "phonepe" ? "bg-black border-black" : "border-gray-300")}>
                    {paymentMethod === "phonepe" && <Check className="h-3 w-3 text-white" />}
                </div>
                <RadioGroupItem value="phonepe" id="phonepe" className="sr-only" />
              </div>
            </RadioGroup>

            <Button 
              className="w-full bg-[#F06A5D] hover:bg-[#d65a4e] text-white py-6 text-lg rounded-xl shadow-lg mt-4"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Pay"
              )}
            </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
