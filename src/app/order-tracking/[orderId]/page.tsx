
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  MapPin,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Home,
  ShoppingBag,
  ShoppingCart,
  Navigation
} from "lucide-react";
import { PlacedOrder, VendorOrderPortion } from "@/lib/orderModels";
import { getSupabaseClient } from "@/lib/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import { OrderTrackingMap } from "@/components/OrderTrackingMap";

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const [order, setOrder] = React.useState<PlacedOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("orders"); // 'orders' is the main view
  const supabase = React.useMemo(() => getSupabaseClient(), []);

  React.useEffect(() => {
    if (!orderId) return;

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from("placed_orders")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (error) throw error;

        if (data && isMounted) {
          setOrder(mapSupabaseOrder(data));
        } else if (isMounted) {
          toast({ title: "Error", description: "Order not found", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        if (isMounted) {
          toast({ title: "Error", description: "Failed to load order", variant: "destructive" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrder();

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "placed_orders",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) {
            setOrder(mapSupabaseOrder(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [orderId, supabase, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
        <Button onClick={() => router.push('/home')}>Go Home</Button>
      </div>
    );
  }

  const isPaymentFailed = order.paymentStatus === "Failed";
  const isCompleted = order.overallStatus === "Completed";
  const isActive = !isPaymentFailed && !isCompleted && order.overallStatus !== "Cancelled";

  // Prepare vendor locations for map
  const vendorLocations = order.vendorPortions
    .filter(v => v.vendorLocation)
    .map(v => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      vendorAddress: v.vendorAddress,
      latitude: v.vendorLocation!.latitude,
      longitude: v.vendorLocation!.longitude
    }));

  // Function to open Google Maps with directions
  const openInGoogleMaps = (vendor: VendorOrderPortion) => {
    if (!vendor.vendorLocation) return;
    
    const { latitude, longitude } = vendor.vendorLocation;
    const destination = `${latitude},${longitude}`;
    const label = encodeURIComponent(vendor.vendorName);
    
    // Google Maps URL for navigation
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
           {/* Back button hidden in design but good for UX */}
           {/* <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button> */}
          <h1 className="text-2xl font-bold">My order</h1>
        </div>
        <div className="flex gap-4 text-2xl">
            {/* Signal/Wifi icons would go here in a real app */}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 pb-24">
        
        {/* Status Header Card */}
        {isActive && (
            <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Active Orders
                </div>
            </div>
        )}

        {isPaymentFailed && (
             <div className="bg-[#D34537] text-white text-xs font-bold px-4 py-1.5 rounded-t-lg w-fit mb-0">
                Payment Failed!
            </div>
        )}

        {/* Map Overview */}
        {vendorLocations.length > 0 && !isCompleted && (
          <Card className="overflow-hidden border-none shadow-sm">
            <CardContent className="p-0">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Pickup Locations
                </h3>
              </div>
              <OrderTrackingMap 
                vendors={vendorLocations}
                className="h-[200px] w-full"
              />
            </CardContent>
          </Card>
        )}

        <Card className={`overflow-hidden border-none shadow-sm ${isPaymentFailed ? 'rounded-tl-none border-t-2 border-[#D34537]' : ''}`}>
            <CardContent className="p-0">
                {/* Timer / Status Banner */}
                {!isPaymentFailed && (
                    <div className="p-4 flex items-center justify-between border-b border-dashed">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-[#F06A5D] flex items-center justify-center text-[#F06A5D]">
                                <Clock className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-sm">Ready to pickup in 15 min</span>
                        </div>
                        <span className="text-[#4ADE80] text-xs font-bold">Payment successful!</span>
                    </div>
                )}

                {/* Trip Details */}
                <div className="p-4 bg-blue-50/50">
                    <div className="bg-blue-100/50 border border-blue-200 rounded-lg p-3 relative overflow-hidden">
                         <p className="text-[10px] text-muted-foreground mb-0.5">Trip to</p>
                         <h3 className="font-semibold text-base text-foreground">{order.tripDestination || "Destination"}</h3>
                         {/* Decorative blob */}
                         <div className="absolute -right-2 -bottom-4 w-16 h-16 bg-blue-200/50 rounded-full blur-xl"></div>
                    </div>
                </div>

                {/* Vendor Items */}
                <div className="p-4 space-y-6">
                    {order.vendorPortions.map((vendor: VendorOrderPortion, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-xs text-gray-800">{vendor.vendorName}</h4>
                            </div>
                            
                            <div className="space-y-4">
                                {Array.isArray(vendor.items) && vendor.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border rounded-md p-1 flex-shrink-0">
                                                <Image 
                                                    src={(item as any).imageUrl || "https://placehold.co/40x40.png"} 
                                                    alt={(item as any).name} 
                                                    width={40} 
                                                    height={40} 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.details || "200 gm"}</p>
                                            </div>
                                        </div>
                                        <div className="bg-black text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center">
                                            {item.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Vendor Specific Actions */}
                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between items-center">
                                    {vendor.status === "New" || vendor.status === "Pending Vendor Confirmation" ? (
                                        <p className="text-[10px] text-muted-foreground">Preparation time - 15 min</p>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground">Status: {vendor.status}</p>
                                    )}
                                    
                                    {!isPaymentFailed && (
                                        <Button 
                                            variant="link" 
                                            className="text-[#F06A5D] text-[10px] h-auto p-0 underline decoration-[#F06A5D]/30"
                                            onClick={() => router.push(`/order-tracking/${orderId}/cancel`)}
                                        >
                                            Cancel this order
                                        </Button>
                                    )}
                                </div>
                                
                                {/* Navigate to Vendor Button */}
                                {vendor.vendorLocation && !isCompleted && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                                        onClick={() => openInGoogleMaps(vendor)}
                                    >
                                        <Navigation className="h-3 w-3 mr-1" />
                                        Navigate to {vendor.vendorName}
                                    </Button>
                                )}
                            </div>
                            
                            {index < order.vendorPortions.length - 1 && <Separator className="my-4" />}
                        </div>
                    ))}
                </div>

                {/* Main Action Button */}
                <div className="p-4 pt-0">
                    {isPaymentFailed ? (
                        <Button 
                            variant="link" 
                            className="w-full text-[#F06A5D] font-bold underline decoration-[#F06A5D]/30"
                            onClick={() => router.push('/cart')} // Retry payment flow
                        >
                            Complete Payment
                        </Button>
                    ) : isCompleted ? (
                         <div className="border rounded-full py-2 px-4 flex items-center gap-2 w-fit">
                            <div className="bg-[#4ADE80] rounded-full p-0.5">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-bold">Picked up : 27 Jan 2025</span>
                        </div>
                    ) : (
                        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                            <CardContent className="p-6 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <QrCode className="h-5 w-5" />
                                    <h3 className="font-bold text-sm">Show this QR to vendor</h3>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-md">
                                    <QRCodeCanvas value={orderId} size={200} />
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    The vendor will scan this code to confirm your pickup
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Cancel Full Order Link */}
        {!isPaymentFailed && !isCompleted && (
            <div className="text-center">
                <Button 
                    variant="link" 
                    className="text-[#F06A5D] text-xs underline decoration-[#F06A5D]/30"
                    onClick={() => router.push(`/order-tracking/${orderId}/cancel`)}
                >
                    Cancel Full Order
                </Button>
            </div>
        )}

        {/* Completed Order Example (Mock for visual matching) */}
        {/* In a real app, this would be a separate card or list item */}
        {/* <div className="mt-8 opacity-50 pointer-events-none grayscale">
            <div className="border rounded-full py-2 px-4 flex items-center gap-2 w-fit mb-2">
                <div className="bg-[#4ADE80] rounded-full p-0.5">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-bold">Picked up : 27 Jan 2025</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
        </div> */}

      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 px-6 flex justify-between items-end pb-6 z-20">
        <div className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push('/home')}>
            <Home className="h-6 w-6" />
            <span className="text-[10px] font-medium">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#F06A5D] relative">
             {/* Active Indicator Gradient */}
            <div className="absolute -top-8 w-12 h-12 bg-[#F06A5D]/20 blur-xl rounded-full"></div>
            <div className="bg-gradient-to-b from-[#F06A5D]/10 to-transparent w-16 h-12 absolute -top-2 rounded-t-full"></div>
            
            <ShoppingBag className="h-6 w-6 z-10" />
            <span className="text-[10px] font-bold z-10">Orders</span>
            <div className="h-1 w-12 bg-black rounded-full mt-1"></div>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push('/cart')}>
            <ShoppingCart className="h-6 w-6" />
            <span className="text-[10px] font-medium">My Cart</span>
        </div>
      </div>
    </div>
  );
}

function mapSupabaseOrder(data: any): PlacedOrder {
  return {
    id: data.id,
    orderId: data.order_id,
    customerInfo: data.customer_info || undefined,
    tripStartLocation: data.trip_start_location || undefined,
    tripDestination: data.trip_destination || undefined,
    createdAt: data.created_at,
    overallStatus: data.overall_status,
    paymentStatus: data.payment_status,
    grandTotal: Number(data.grand_total) || 0,
    platformFee: Number(data.platform_fee) || 0,
    paymentGatewayFee: Number(data.payment_gateway_fee) || 0,
    vendorPortions: data.vendor_portions || [],
    vendorIds: data.vendor_ids || [],
  };
}
