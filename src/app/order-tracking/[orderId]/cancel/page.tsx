"use client";

export const dynamic = 'force-dynamic';

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PlacedOrder } from "@/lib/orderModels";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function CancelOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const [order, setOrder] = React.useState<PlacedOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string>("");
  const [otherReason, setOtherReason] = React.useState("");

  const supabase = React.useMemo(() => getSupabaseClient(), []);

  React.useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const { data, error } = await supabase
          .from("placed_orders")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setOrder(mapSupabaseOrder(data));
        } else {
          toast({ title: "Error", description: "Order not found", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast({ title: "Error", description: "Failed to load order details", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, supabase, toast]);

  const handleCancelOrder = async () => {
    if (!selectedReason) {
      toast({ title: "Select Reason", description: "Please select a reason for cancellation.", variant: "destructive" });
      return;
    }
    if (selectedReason === "Other" && !otherReason.trim()) {
      toast({ title: "Specify Reason", description: "Please write your reason.", variant: "destructive" });
      return;
    }

    setIsCancelling(true);
    try {
      const finalReason = selectedReason === "Other" ? otherReason : selectedReason;
      
      const cancellationDetails = {
        reason: finalReason,
        cancelledAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from("placed_orders")
        .update({
          overall_status: "Cancelled",
          customer_info: {
            ...(order?.customerInfo || {}),
            cancellation: cancellationDetails
          }
        })
        .eq("order_id", orderId);

      if (error) {
        throw error;
      }

      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });

      // Navigate back to tracking page
      router.push(`/order-tracking/${orderId}`);
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Cancellation Failed",
        description: "Could not cancel the order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) return null;

  // Calculate total for display (simplified)
  const totalAmount = order.grandTotal;

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-gray-100" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1 text-center mr-8">Cancel order</h1>
      </div>

      <div className="space-y-6 pb-24">
        {/* Order Details Card */}
        <Card className="border-red-100 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-4">Order details:</h3>
            <div className="space-y-4">
                {order.vendorPortions.map((vendor, idx) => (
                    <div key={idx}>
                         <p className="text-xs font-semibold text-muted-foreground mb-2">{vendor.vendorName}</p>
                         {vendor.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-start mb-2">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex-shrink-0">
                                        <Image 
                                            src={item.imageUrl || "https://placehold.co/40x40.png"} 
                                            alt={item.name} 
                                            width={40} 
                                            height={40} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{item.name} X {item.quantity}</p>
                                        <p className="text-xs text-muted-foreground">{item.details || "200 gm"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {/* <p className="text-[10px] text-muted-foreground line-through">₹{Math.round(item.totalPrice * 1.1)}</p> */}
                                    <p className="font-bold text-sm">₹{item.totalPrice}</p>
                                </div>
                            </div>
                         ))}
                         {idx < order.vendorPortions.length - 1 && <Separator className="my-2" />}
                    </div>
                ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between items-center font-bold">
                <span>Total amount</span>
                <span>₹{totalAmount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-4 text-[#8D6E63]">
            <h4 className="font-bold text-sm mb-2 text-[#795548]">Cancellation Policy</h4>
            <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>You can cancel items before they are handed over to you.</li>
                <li>Once the order is picked up, cancellation is not allowed.</li>
                <li>Refunds (if applicable) will be processed within "X" business days.</li>
            </ul>
        </div>

        {/* Reason Selection */}
        <div>
            <h4 className="font-bold text-sm mb-4">Reason for Cancellation (Choose one)</h4>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
                {[
                    "Order by mistake",
                    "Found a better price elsewhere",
                    "No longer needed",
                    "Planning to change route",
                    "Other"
                ].map((reason) => (
                    <div key={reason} className="flex items-center space-x-2">
                        <RadioGroupItem value={reason} id={reason} className={selectedReason === reason ? "text-[#F06A5D] border-[#F06A5D]" : ""} />
                        <Label htmlFor={reason} className={`font-normal ${selectedReason === reason ? "text-[#F06A5D]" : "text-gray-600"}`}>{reason}</Label>
                    </div>
                ))}
            </RadioGroup>

            {selectedReason === "Other" && (
                <Textarea 
                    placeholder="Write your reason here.." 
                    className="mt-3 border-red-200 focus:border-[#F06A5D] focus:ring-[#F06A5D]"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                />
            )}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button 
            className="w-full bg-[#F06A5D] hover:bg-[#d65a4e] text-white py-6 text-lg rounded-xl shadow-lg"
            onClick={handleCancelOrder}
            disabled={isCancelling}
        >
            {isCancelling ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Cancelling...
                </>
            ) : (
                "Understood! Proceed to Cancel"
            )}
        </Button>
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
