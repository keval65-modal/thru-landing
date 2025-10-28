import { 
  VendorRequestPayload, 
  RequestItem, 
  VendorResponsePayload, 
  VendorOffer, 
  AggregatedOffer, 
  AggregatedItemOffer,
  UNIT_CONVERSIONS,
  FRACTIONAL_CAPABLE_UNITS,
  DISCRETE_UNITS
} from '@/types/vendor-requests';

export class VendorRequestService {
  
  /**
   * Normalize user input units and convert values
   */
  static normalizeUnits(items: RequestItem[]): RequestItem[] {
    return items.map(item => {
      const normalized = { ...item };
      
      // Convert to standard units
      if (item.requested_qty_unit === 'g' && item.requested_qty_value >= 1000) {
        normalized.requested_qty_value = item.requested_qty_value * 0.001;
        normalized.requested_qty_unit = 'kg';
      } else if (item.requested_qty_unit === 'ml' && item.requested_qty_value >= 1000) {
        normalized.requested_qty_value = item.requested_qty_value * 0.001;
        normalized.requested_qty_unit = 'l';
      }
      
      return normalized;
    });
  }

  /**
   * Generate suggested packs based on unit type
   */
  static generateSuggestedPacks(item: RequestItem): RequestItem['suggested_packs'] {
    const unit = item.requested_qty_unit;
    const value = item.requested_qty_value;
    
    if (unit === 'kg') {
      return [
        { pack_value: 0.25, pack_unit: 'kg' },
        { pack_value: 0.5, pack_unit: 'kg' },
        { pack_value: 1, pack_unit: 'kg' },
        { pack_value: 2, pack_unit: 'kg' }
      ];
    } else if (unit === 'g') {
      return [
        { pack_value: 250, pack_unit: 'g' },
        { pack_value: 500, pack_unit: 'g' },
        { pack_value: 1000, pack_unit: 'g' }
      ];
    } else if (unit === 'l') {
      return [
        { pack_value: 0.25, pack_unit: 'l' },
        { pack_value: 0.5, pack_unit: 'l' },
        { pack_value: 1, pack_unit: 'l' }
      ];
    } else if (unit === 'ml') {
      return [
        { pack_value: 250, pack_unit: 'ml' },
        { pack_value: 500, pack_unit: 'ml' },
        { pack_value: 1000, pack_unit: 'ml' }
      ];
    } else if (unit === 'pcs') {
      return [
        { pack_value: 1, pack_unit: 'pcs' },
        { pack_value: 2, pack_unit: 'pcs' },
        { pack_value: 4, pack_unit: 'pcs' },
        { pack_value: 8, pack_unit: 'pcs' }
      ];
    }
    
    return [];
  }

  /**
   * Convert quantity from one unit to another
   */
  static convertQuantity(value: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return value;
    
    const conversion = UNIT_CONVERSIONS.find(c => c.from_unit === fromUnit && c.to_unit === toUnit);
    if (conversion) {
      return value * conversion.conversion_factor;
    }
    
    // Reverse conversion
    const reverseConversion = UNIT_CONVERSIONS.find(c => c.from_unit === toUnit && c.to_unit === fromUnit);
    if (reverseConversion) {
      return value / reverseConversion.conversion_factor;
    }
    
    throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
  }

  /**
   * Calculate packs needed for a request
   */
  static calculatePacksNeeded(
    requestedQty: number, 
    requestedUnit: string, 
    packValue: number, 
    packUnit: string,
    allowFractional: boolean
  ): { packsNeeded: number; totalPrice: number; surplusQty?: number; surplusUnit?: string } {
    
    // Convert requested quantity to pack unit
    const requestedQtyInPackUnit = this.convertQuantity(requestedQty, requestedUnit, packUnit);
    
    if (allowFractional) {
      // Allow fractional pricing
      const totalPrice = requestedQtyInPackUnit * (1 / packValue); // This would need price_per_pack
      return { packsNeeded: Math.ceil(requestedQtyInPackUnit / packValue), totalPrice };
    } else {
      // Whole packs only
      const packsNeeded = Math.ceil(requestedQtyInPackUnit / packValue);
      const totalPrice = packsNeeded * (1 / packValue); // This would need price_per_pack
      const surplusQty = (packsNeeded * packValue) - requestedQtyInPackUnit;
      
      return {
        packsNeeded,
        totalPrice,
        surplusQty: surplusQty > 0 ? surplusQty : undefined,
        surplusUnit: surplusQty > 0 ? packUnit : undefined
      };
    }
  }

  /**
   * Aggregate vendor offers for a request
   */
  static aggregateVendorOffers(
    request: VendorRequestPayload,
    vendorResponses: VendorResponsePayload[]
  ): AggregatedOffer[] {
    
    const aggregatedOffers: AggregatedOffer[] = [];
    
    for (const response of vendorResponses) {
      const vendorOffer: AggregatedOffer = {
        vendor_id: response.vendor_id,
        vendor_name: `Vendor ${response.vendor_id}`, // This would come from vendor profile
        total_price: 0,
        currency: 'INR',
        lead_time_minutes: 0,
        items: [],
        can_fulfill_completely: true
      };
      
      let totalPrice = 0;
      let maxLeadTime = 0;
      
      for (const item of request.items) {
        const itemOffers = response.offers.filter(offer => offer.request_item_id === item.request_item_id);
        
        if (itemOffers.length === 0) {
          vendorOffer.can_fulfill_completely = false;
          continue;
        }
        
        // Find the best offer for this item (cheapest)
        const bestOffer = this.findBestOfferForItem(item, itemOffers);
        
        if (bestOffer) {
          const aggregatedItem = this.aggregateItemOffer(item, bestOffer);
          vendorOffer.items.push(aggregatedItem);
          totalPrice += aggregatedItem.price_total;
          maxLeadTime = Math.max(maxLeadTime, bestOffer.lead_time_minutes);
        } else {
          vendorOffer.can_fulfill_completely = false;
        }
      }
      
      vendorOffer.total_price = totalPrice;
      vendorOffer.lead_time_minutes = maxLeadTime;
      
      if (vendorOffer.items.length > 0) {
        aggregatedOffers.push(vendorOffer);
      }
    }
    
    // Sort by total price, then lead time
    return aggregatedOffers.sort((a, b) => {
      if (a.total_price !== b.total_price) {
        return a.total_price - b.total_price;
      }
      return a.lead_time_minutes - b.lead_time_minutes;
    });
  }

  /**
   * Find the best offer for a specific item
   */
  private static findBestOfferForItem(item: RequestItem, offers: VendorOffer[]): VendorOffer | null {
    if (offers.length === 0) return null;
    
    // Prefer exact offers if available and user allows fractional
    const exactOffers = offers.filter(offer => offer.type === 'exact_qty_offer');
    if (exactOffers.length > 0 && item.allow_fractional_by_user) {
      return exactOffers.reduce((best, current) => 
        (current.price_total || 0) < (best.price_total || 0) ? current : best
      );
    }
    
    // Otherwise, find cheapest pack offer
    const packOffers = offers.filter(offer => offer.type === 'pack_offer');
    if (packOffers.length > 0) {
      return packOffers.reduce((best, current) => {
        const currentTotal = this.calculatePacksNeeded(
          item.requested_qty_value,
          item.requested_qty_unit,
          current.pack_value || 1,
          current.pack_unit || item.requested_qty_unit,
          item.allow_fractional_by_user
        ).totalPrice * (current.price_per_pack || 0);
        
        const bestTotal = this.calculatePacksNeeded(
          item.requested_qty_value,
          item.requested_qty_unit,
          best.pack_value || 1,
          best.pack_unit || item.requested_qty_unit,
          item.allow_fractional_by_user
        ).totalPrice * (best.price_per_pack || 0);
        
        return currentTotal < bestTotal ? current : best;
      });
    }
    
    return null;
  }

  /**
   * Aggregate a single item offer
   */
  private static aggregateItemOffer(item: RequestItem, offer: VendorOffer): AggregatedItemOffer {
    if (offer.type === 'exact_qty_offer') {
      return {
        request_item_id: item.request_item_id,
        product_name: item.product_name,
        requested_qty_value: item.requested_qty_value,
        requested_qty_unit: item.requested_qty_unit,
        offer_type: 'exact',
        fulfillment_qty_value: item.requested_qty_value,
        fulfillment_qty_unit: item.requested_qty_unit,
        price_total: offer.price_total || 0,
        price_per_unit: (offer.price_total || 0) / item.requested_qty_value,
        notes: offer.notes
      };
    } else {
      // Pack offer
      const packCalculation = this.calculatePacksNeeded(
        item.requested_qty_value,
        item.requested_qty_unit,
        offer.pack_value || 1,
        offer.pack_unit || item.requested_qty_unit,
        item.allow_fractional_by_user
      );
      
      return {
        request_item_id: item.request_item_id,
        product_name: item.product_name,
        requested_qty_value: item.requested_qty_value,
        requested_qty_unit: item.requested_qty_unit,
        offer_type: packCalculation.surplusQty ? 'pack' : 'exact',
        fulfillment_qty_value: packCalculation.packsNeeded * (offer.pack_value || 1),
        fulfillment_qty_unit: offer.pack_unit || item.requested_qty_unit,
        surplus_qty_value: packCalculation.surplusQty,
        surplus_qty_unit: packCalculation.surplusUnit,
        price_total: packCalculation.totalPrice * (offer.price_per_pack || 0),
        packs_needed: packCalculation.packsNeeded,
        pack_value: offer.pack_value,
        pack_unit: offer.pack_unit,
        notes: offer.notes
      };
    }
  }

  /**
   * Validate vendor request payload
   */
  static validateRequestPayload(payload: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!payload.request_id || typeof payload.request_id !== 'string') {
      errors.push('request_id is required and must be a string');
    }
    
    if (!payload.user_id || typeof payload.user_id !== 'string') {
      errors.push('user_id is required and must be a string');
    }
    
    if (!payload.location || typeof payload.location.lat !== 'number' || typeof payload.location.lng !== 'number') {
      errors.push('location with lat/lng is required');
    }
    
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      errors.push('items array is required and must not be empty');
    }
    
    for (const [index, item] of payload.items.entries()) {
      if (!item.request_item_id || typeof item.request_item_id !== 'string') {
        errors.push(`items[${index}].request_item_id is required`);
      }
      
      if (!item.product_name || typeof item.product_name !== 'string') {
        errors.push(`items[${index}].product_name is required`);
      }
      
      if (typeof item.requested_qty_value !== 'number' || item.requested_qty_value <= 0) {
        errors.push(`items[${index}].requested_qty_value must be a positive number`);
      }
      
      if (!['kg', 'g', 'l', 'ml', 'pcs'].includes(item.requested_qty_unit)) {
        errors.push(`items[${index}].requested_qty_unit must be one of: kg, g, l, ml, pcs`);
      }
      
      if (typeof item.allow_fractional_by_user !== 'boolean') {
        errors.push(`items[${index}].allow_fractional_by_user must be a boolean`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate vendor response payload
   */
  static validateResponsePayload(payload: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!payload.request_id || typeof payload.request_id !== 'string') {
      errors.push('request_id is required and must be a string');
    }
    
    if (!payload.vendor_id || typeof payload.vendor_id !== 'string') {
      errors.push('vendor_id is required and must be a string');
    }
    
    if (!Array.isArray(payload.offers) || payload.offers.length === 0) {
      errors.push('offers array is required and must not be empty');
    }
    
    for (const [index, offer] of payload.offers.entries()) {
      if (!['exact_qty_offer', 'pack_offer'].includes(offer.type)) {
        errors.push(`offers[${index}].type must be 'exact_qty_offer' or 'pack_offer'`);
      }
      
      if (!offer.request_item_id || typeof offer.request_item_id !== 'string') {
        errors.push(`offers[${index}].request_item_id is required`);
      }
      
      if (offer.type === 'exact_qty_offer') {
        if (typeof offer.price_total !== 'number' || offer.price_total <= 0) {
          errors.push(`offers[${index}].price_total must be a positive number for exact_qty_offer`);
        }
      } else if (offer.type === 'pack_offer') {
        if (typeof offer.pack_value !== 'number' || offer.pack_value <= 0) {
          errors.push(`offers[${index}].pack_value must be a positive number for pack_offer`);
        }
        
        if (typeof offer.price_per_pack !== 'number' || offer.price_per_pack <= 0) {
          errors.push(`offers[${index}].price_per_pack must be a positive number for pack_offer`);
        }
      }
      
      if (!offer.currency || typeof offer.currency !== 'string') {
        errors.push(`offers[${index}].currency is required`);
      }
      
      if (typeof offer.lead_time_minutes !== 'number' || offer.lead_time_minutes < 0) {
        errors.push(`offers[${index}].lead_time_minutes must be a non-negative number`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}




