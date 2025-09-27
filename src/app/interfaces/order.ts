// src/app/interfaces/order.ts

export interface OrderCustomerInfo {
  id?: string; // If the customer is logged in
  name?: string; // Could be from profile or guest input
  phoneNumber?: string; // Could be from profile or guest input
}

export interface OrderItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
}

export interface VendorOrderPortion {
  vendorId: string;
  vendorName: string;
  vendorAddress?: string; // Optional, but good for vendor reference
  vendorType?: string;
  status: "New" | "Preparing" | "Ready for Pickup" | "Picked Up";
  items: OrderItemDetail[];
  vendorSubtotal: number;
}

export const ActiveOrderStatuses = ["New", "Pending Confirmation", "Confirmed", "In Progress", "Ready for Pickup"] as const;
export const PastOrderStatuses = ["Completed", "Cancelled"] as const;

export interface PlacedOrder {
  orderId: string; // e.g., THRU-XYZ123
  customerInfo?: OrderCustomerInfo; // Optional for now
  tripStartLocation?: string;
  tripDestination?: string;
  createdAt: string; // ISO date string
  overallStatus: typeof ActiveOrderStatuses[number] | typeof PastOrderStatuses[number];
  paymentStatus: "Paid" | "Pending" | "Failed";
  grandTotal: number;
  platformFee: number;
  paymentGatewayFee: number;
  vendorPortions: VendorOrderPortion[];
  vendorIds: string[]; // An array of all vendor IDs in this order for easy querying.
}
