// Vendor Request/Offer System Types
// Implements the exact JSON schemas specified

export interface VendorRequestPayload {
  request_id: string;
  user_id: string;
  location: {
    lat: number;
    lng: number;
  };
  items: RequestItem[];
  deadline_utc: string;
}

export interface RequestItem {
  request_item_id: string;
  product_name: string;
  normalized_hint?: string;
  requested_qty_value: number;
  requested_qty_unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
  allow_fractional_by_user: boolean;
  notes?: string;
  suggested_packs: SuggestedPack[];
}

export interface SuggestedPack {
  pack_value: number;
  pack_unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
}

export interface VendorResponsePayload {
  request_id: string;
  vendor_id: string;
  offers: VendorOffer[];
  submitted_at: string;
}

export interface VendorOffer {
  type: 'exact_qty_offer' | 'pack_offer';
  request_item_id: string;
  can_fulfill_exact?: boolean;
  price_total?: number;
  pack_value?: number;
  pack_unit?: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
  price_per_pack?: number;
  available_packs?: number;
  currency: string;
  lead_time_minutes: number;
  notes?: string;
  fractional_allowed?: boolean;
  split_fee_percent?: number;
  incompatible_unit?: boolean;
}

export interface AggregatedOffer {
  vendor_id: string;
  vendor_name: string;
  total_price: number;
  currency: string;
  lead_time_minutes: number;
  distance_km?: number;
  items: AggregatedItemOffer[];
  can_fulfill_completely: boolean;
  partial_fulfillment?: {
    missing_items: string[];
    available_items: string[];
  };
}

export interface AggregatedItemOffer {
  request_item_id: string;
  product_name: string;
  requested_qty_value: number;
  requested_qty_unit: string;
  offer_type: 'exact' | 'pack' | 'partial';
  fulfillment_qty_value: number;
  fulfillment_qty_unit: string;
  surplus_qty_value?: number;
  surplus_qty_unit?: string;
  price_total: number;
  price_per_unit?: number;
  packs_needed?: number;
  pack_value?: number;
  pack_unit?: string;
  notes?: string;
}

export interface OrderCreationPayload {
  request_id: string;
  vendor_id: string;
  accepted_offers: {
    request_item_id: string;
    offer_type: 'exact_qty_offer' | 'pack_offer';
    final_price: number;
    final_qty_value: number;
    final_qty_unit: string;
  }[];
  total_amount: number;
  currency: string;
  delivery_address?: {
    lat: number;
    lng: number;
    address: string;
  };
  notes?: string;
}

export interface UnitConversion {
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
}

// Business logic constants
export const UNIT_CONVERSIONS: UnitConversion[] = [
  { from_unit: 'g', to_unit: 'kg', conversion_factor: 0.001 },
  { from_unit: 'kg', to_unit: 'g', conversion_factor: 1000 },
  { from_unit: 'ml', to_unit: 'l', conversion_factor: 0.001 },
  { from_unit: 'l', to_unit: 'ml', conversion_factor: 1000 },
];

export const DEFAULT_SUGGESTED_PACKS = {
  'kg': [{ pack_value: 0.25, pack_unit: 'kg' as const }, { pack_value: 0.5, pack_unit: 'kg' as const }, { pack_value: 1, pack_unit: 'kg' as const }, { pack_value: 2, pack_unit: 'kg' as const }],
  'g': [{ pack_value: 250, pack_unit: 'g' as const }, { pack_value: 500, pack_unit: 'g' as const }, { pack_value: 1000, pack_unit: 'g' as const }],
  'l': [{ pack_value: 0.25, pack_unit: 'l' as const }, { pack_value: 0.5, pack_unit: 'l' as const }, { pack_value: 1, pack_unit: 'l' as const }],
  'ml': [{ pack_value: 250, pack_unit: 'ml' as const }, { pack_value: 500, pack_unit: 'ml' as const }, { pack_value: 1000, pack_unit: 'ml' as const }],
  'pcs': [{ pack_value: 1, pack_unit: 'pcs' as const }, { pack_value: 2, pack_unit: 'pcs' as const }, { pack_value: 4, pack_unit: 'pcs' as const }, { pack_value: 8, pack_unit: 'pcs' as const }],
};

export const FRACTIONAL_CAPABLE_UNITS = ['kg', 'g', 'l', 'ml'];
export const DISCRETE_UNITS = ['pcs'];




