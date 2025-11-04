"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/layout/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  PackageCheck,
  ShoppingBag,
  Loader2,
  Home,
  MapPin,
  Package,
} from "lucide-react";
import { auth } from "@/lib/firebase"; // Keep Firebase Auth for user ID
import { SupabaseOrderService, type Order } from "@/lib/supabase/order-service";

export default function OrdersPageSupabase() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Get user ID from Firebase Auth
  React.useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe?.();
  }, []);

  // Fetch orders from Supabase
  React.useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log('📋 Fetching orders from Supabase for user:', userId);
        
        const userOrders = await SupabaseOrderService.getUserOrders(userId);
        
        console.log(`✅ Fetched ${userOrders.length} orders from Supabase`);
        setOrders(userOrders);

      } catch (error) {
        console.error("❌ Error fetching orders from Supabase:", error);
        toast({
          title: "Error fetching orders",
          description: "Could not retrieve your orders. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [userId, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_quotes':
        return 'text-yellow-600 bg-yellow-100';
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'preparing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_quotes':
        return 'Waiting for Vendor Quotes';
      case 'confirmed':
        return 'Order Confirmed';
      case 'preparing':
        return 'Preparing Your Order';
      case 'completed':
        return 'Order Completed';
      case 'cancelled':
        return 'Order Cancelled';
      default:
        return status;
    }
  };

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Please log in to view your orders</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-background p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div className="flex-1"></div>
        <h1 className="text-2xl font-semibold text-foreground text-center flex-1">My Orders</h1>
        <div className="flex-1 flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
            <Home className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Fetching your orders from Supabase...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <ShoppingBag className="mx-auto h-16 w-16 mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first order and track it here!
            </p>
            <Button onClick={() => router.push('/plan-trip')}>
              Start Planning Trip
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${getStatusColor(order.status)}`}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {getStatusLabel(order.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Route Information */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="text-sm font-medium">
                          {order.route.startLocation?.address || 
                           `${order.route.startLocation?.lat.toFixed(4)}, ${order.route.startLocation?.lng.toFixed(4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">To</p>
                        <p className="text-sm font-medium">
                          {order.route.endLocation?.address || 
                           `${order.route.endLocation?.lat.toFixed(4)}, ${order.route.endLocation?.lng.toFixed(4)}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Items ({order.items.length})</p>
                    </div>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between items-center text-sm">
                          <span className="flex-1">{item.name}</span>
                          <span className="text-muted-foreground">
                            {item.quantity} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Vendor Quotes */}
                  {order.vendorQuotes && order.vendorQuotes.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-semibold mb-2">
                          Vendor Quotes ({order.vendorQuotes.length})
                        </p>
                        <div className="space-y-2">
                          {order.vendorQuotes.map((quote, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-muted/50">
                              <div className="flex justify-between items-center">
                                <p className="font-medium text-sm">{quote.vendorName}</p>
                                <p className="text-sm font-semibold">₹{quote.totalPrice}</p>
                              </div>
                              {quote.estimatedReadyTime && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Ready in: {quote.estimatedReadyTime}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Total Amount */}
                  {order.totalAmount && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total Amount</p>
                        <p className="text-lg font-bold text-primary">₹{order.totalAmount}</p>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => router.push(`/order-tracking/${order.id}`)}
                    >
                      Track Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}



