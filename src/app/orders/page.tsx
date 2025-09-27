
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/layout/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  QrCode,
  PackageCheck,
  ShoppingBag,
  CheckCircle,
  Dot,
  Loader2,
  Home,
  Map,
  Navigation,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { PlacedOrder, VendorOrderPortion, PastOrderStatuses, ActiveOrderStatuses } from "@/app/interfaces/order";

// Re-defining interfaces to match the component's expected structure
// This will be populated by transforming data from Firestore
interface TransformedOrderItem {
  id: string;
  name: string;
  details?: string;
  quantity: number;
  imageUrl?: string;
  dataAiHint?: string;
  price: number;
}

interface TransformedVendorOrder {
  vendorId: string;
  vendorName: string;
  vendorLocation?: string;
  items: TransformedOrderItem[];
  vendorStatus: VendorOrderPortion['status'];
  isCompleted: boolean;
}

interface TransformedFullOrder {
  id: string;
  tripFrom?: string;
  tripTo?: string;
  status: "active" | "past"; // 'active' or 'past' for tab placement
  overallStatus?: PlacedOrder['overallStatus'];
  paymentStatus?: PlacedOrder['paymentStatus'];
  pickupDate?: string; // Formatted date for display
  createdAt: string;
  vendorOrders: TransformedVendorOrder[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<TransformedFullOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        if (!db) {
          console.warn("[Orders Page] Firestore not initialized, skipping orders fetch");
          setOrders([]);
          return;
        }
        
        const ordersCollectionRef = collection(db, "orders");
        // Fetch orders and sort by creation date descending
        const q = query(ordersCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const fetchedOrders: TransformedFullOrder[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<PlacedOrder, 'orderId'>;
          const orderId = doc.id;

          const vendorOrders: TransformedVendorOrder[] = data.vendorPortions.map(portion => {
            const items: TransformedOrderItem[] = portion.items.map(itemDetail => ({
              id: itemDetail.itemId,
              name: itemDetail.name,
              details: itemDetail.details,
              quantity: itemDetail.quantity,
              imageUrl: itemDetail.imageUrl,
              dataAiHint: itemDetail.dataAiHint,
              price: itemDetail.pricePerItem,
            }));

            return {
              vendorId: portion.vendorId,
              vendorName: portion.vendorName,
              vendorLocation: portion.vendorAddress,
              items: items,
              vendorStatus: portion.status,
              isCompleted: portion.status === 'Picked Up',
            };
          });
          
          const isOrderPast = PastOrderStatuses.includes(data.overallStatus as any);

          const transformedOrder: TransformedFullOrder = {
            id: orderId,
            tripFrom: data.tripStartLocation,
            tripTo: data.tripDestination,
            status: isOrderPast ? 'past' : 'active',
            overallStatus: data.overallStatus,
            paymentStatus: data.paymentStatus,
            createdAt: data.createdAt,
            pickupDate: isOrderPast ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
            vendorOrders: vendorOrders,
          };

          fetchedOrders.push(transformedOrder);
        });

        setOrders(fetchedOrders);
        console.log("Orders fetched and transformed from Firestore:", fetchedOrders);

      } catch (error) {
        console.error("Error fetching orders from Firestore:", error);
        toast({
          title: "Error fetching orders",
          description: "Could not retrieve your order history. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [toast]);


  const handleCancelOrder = (orderId: string, vendorId?: string) => {
    toast({
      title: "Order Cancellation",
      description: `Request to cancel ${vendorId ? `vendor order from ${vendorId}` : `full order ${orderId}`} (Not implemented).`,
      variant: "default",
    });
  };

  const activeOrders = orders.filter((order) => order.status === "active");
  const pastOrders = orders.filter((order) => order.status === "past");

  const getOverallStatusMessage = (order: TransformedFullOrder) => {
    if (order.overallStatus === 'New') {
      return "Order Placed. Awaiting vendor confirmation.";
    }
    if (order.overallStatus === 'Confirmed') {
      return "Order confirmed. Awaiting vendor preparation.";
    }
    const readyVendors = order.vendorOrders.filter(vo => vo.vendorStatus === 'Ready for Pickup').length;
    if (readyVendors > 0) {
      return `${readyVendors} stop(s) ready for pickup.`;
    }
    const preparingVendors = order.vendorOrders.filter(vo => vo.vendorStatus === 'Preparing').length;
    if (preparingVendors > 0) {
      return `${preparingVendors} stop(s) preparing your order.`;
    }

    return order.overallStatus || "Processing...";
  };
  
  const handleTrackOrder = (order: TransformedFullOrder) => {
      const params = new URLSearchParams();
      if (order.tripFrom) params.set("start", order.tripFrom);
      if (order.tripTo) params.set("destination", order.tripTo);
      
      const vendorIds = order.vendorOrders.map(vo => vo.vendorId).join(',');
      if (vendorIds) params.set("vendorIds", vendorIds);
      
      if (order.tripFrom && order.tripTo && vendorIds) {
        router.push(`/order-tracking/${order.id}?${params.toString()}`);
      } else {
        toast({
          title: "Cannot Track Order",
          description: "Trip details or vendor information is missing for this order.",
          variant: "destructive",
        });
      }
  };

  const handleNavigateWithGoogleMaps = (order: TransformedFullOrder) => {
    const { tripFrom, tripTo, vendorOrders } = order;

    if (!tripFrom || !tripTo) {
      toast({
        title: "Error",
        description: "Start or destination location is missing for navigation.",
        variant: "destructive",
      });
      return;
    }

    const waypointsString = vendorOrders
      .map(vo => vo.vendorLocation)
      .filter(Boolean)
      .map(location => encodeURIComponent(location!))
      .join('|');

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tripFrom)}&destination=${encodeURIComponent(tripTo)}${waypointsString ? `&waypoints=${waypointsString}` : ''}&travelmode=driving`;

    console.log("Orders Page: Opening Google Maps URL:", googleMapsUrl);
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-background p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div className="flex-1"></div> {/* Spacer */}
        <h1 className="text-2xl font-semibold text-foreground text-center flex-1">My Orders</h1>
        <div className="flex-1 flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
            <Home className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Fetching your orders...</p>
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full p-0">
            <TabsList className="grid w-full grid-cols-2 sticky top-[70px] z-10 bg-background rounded-none border-b">
              <TabsTrigger value="active" className="pb-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none">
                <Dot className="mr-1 h-7 w-7 text-green-500 -ml-2" />
                Active Orders ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="pb-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none">
                Past Orders ({pastOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              {activeOrders.length === 0 && (
                <div className="text-center p-10 text-muted-foreground">
                  <ShoppingBag className="mx-auto h-12 w-12 mb-4" />
                  No active orders.
                </div>
              )}
              {activeOrders.map((order) => (
                <Card key={order.id} className="m-4 shadow-lg rounded-xl">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      {order.overallStatus && (
                        <div className="flex items-center text-sm text-orange-600 font-medium bg-orange-100 px-3 py-1.5 rounded-full">
                          <Clock className="h-4 w-4 mr-1.5" />
                          {getOverallStatusMessage(order)}
                        </div>
                      )}
                      {order.paymentStatus === 'Paid' && (
                        <div className="text-sm text-green-600 font-medium flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Payment successful!
                        </div>
                      )}
                    </div>

                    <div className="p-3 border border-blue-300 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">Trip to</p>
                      <p className="text-md font-semibold text-blue-900">{order.tripTo}</p>
                    </div>

                    {order.vendorOrders.map((vendorOrder, vIndex) => (
                      <div key={vendorOrder.vendorId}>
                        {vIndex > 0 && <Separator className="my-4" />}
                        <p className="text-sm font-semibold text-foreground">{vendorOrder.vendorName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{vendorOrder.vendorLocation}</p>

                        <ul className="space-y-3 mb-3">
                          {vendorOrder.items.map((item) => (
                            <li key={item.id} className="flex items-center space-x-3">
                              <Image
                                src={item.imageUrl || 'https://placehold.co/80x80.png'}
                                alt={item.name}
                                width={56}
                                height={56}
                                className="rounded-md border bg-muted"
                                data-ai-hint={item.dataAiHint || 'product image'}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.details}</p>
                              </div>
                              <div className="bg-foreground text-background h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {item.quantity}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="flex justify-between items-center mb-3">
                          <p className={`text-xs font-medium ${vendorOrder.isCompleted ? 'text-green-600' : 'text-primary'}`}>Status: {vendorOrder.vendorStatus}</p>
                          {!vendorOrder.isCompleted && (
                            <Button
                              variant="link"
                              className="text-destructive p-0 h-auto text-xs"
                              onClick={() => handleCancelOrder(order.id, vendorOrder.vendorId)}
                            >
                              Cancel this order
                            </Button>
                          )}
                        </div>

                        {!vendorOrder.isCompleted ? (
                          <Button
                            className="w-full bg-foreground hover:bg-foreground/90 text-background py-3"
                            onClick={() => router.push(`/orders/scan-qr/${order.id}?vendorId=${vendorOrder.vendorId}`)}
                          >
                            <QrCode className="mr-2 h-5 w-5" />
                            Scan QR to Confirm Pickup
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center text-green-600 bg-green-100 p-2.5 rounded-md">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            <span className="text-sm font-medium">Vendor Order Picked Up!</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <Separator className="my-4" />
                    <div className="space-y-2">
                        <Button
                            className="w-full"
                            onClick={() => handleTrackOrder(order)}
                            variant="outline"
                        >
                            <Map className="mr-2 h-5 w-5 text-primary"/>
                            Track in App
                        </Button>
                         <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleNavigateWithGoogleMaps(order)}
                        >
                            <Navigation className="mr-2 h-5 w-5"/>
                            Navigate with Google Maps
                        </Button>
                        <Button
                        variant="link"
                        className="text-destructive p-0 h-auto text-sm w-full"
                        onClick={() => handleCancelOrder(order.id)}
                        >
                        Cancel Full Order
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              {pastOrders.length === 0 && (
                <div className="text-center p-10 text-muted-foreground">
                  <ShoppingBag className="mx-auto h-12 w-12 mb-4" />
                  No past orders.
                </div>
              )}
              {pastOrders.map((order) => (
                <Card key={order.id} className="m-4 shadow-lg rounded-xl">
                  <CardContent className="p-4 space-y-3">
                    {order.pickupDate && (
                      <div className="flex items-center text-sm text-green-600 font-medium bg-green-100 px-3 py-1.5 rounded-full">
                        <PackageCheck className="h-4 w-4 mr-1.5" />
                        Picked up : {order.pickupDate}
                      </div>
                    )}
                    <div className="p-3 border border-gray-300 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-700">Trip to</p>
                      <p className="text-md font-semibold text-gray-900">{order.tripTo}</p>
                    </div>

                    {order.vendorOrders.map((vendorOrder, vIndex) => (
                      <div key={vendorOrder.vendorId}>
                        {vIndex > 0 && <Separator className="my-4" />}
                        <p className="text-sm font-semibold text-foreground">{vendorOrder.vendorName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{vendorOrder.vendorLocation}</p>
                        <ul className="space-y-3">
                          {vendorOrder.items.map((item) => (
                            <li key={item.id} className="flex items-center space-x-3">
                              <Image
                                src={item.imageUrl || 'https://placehold.co/80x80.png'}
                                alt={item.name}
                                width={56}
                                height={56}
                                className="rounded-md border bg-muted"
                                data-ai-hint={item.dataAiHint || 'product image'}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.details}</p>
                              </div>
                              <div className="bg-foreground text-background h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {item.quantity}
                              </div>
                            </li>
                          ))}
                        </ul>
                        {vendorOrder.isCompleted && (
                          <div className="mt-2 flex items-center text-xs text-green-600">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Picked up from this vendor
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
