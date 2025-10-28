import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Star,
  Truck,
  DollarSign
} from 'lucide-react';
import { AggregatedOffer, AggregatedItemOffer } from '@/types/vendor-requests';

interface VendorOffersDisplayProps {
  requestId: string;
  onOrderAccept: (vendorId: string, offers: AggregatedItemOffer[]) => void;
  className?: string;
}

export const VendorOffersDisplay: React.FC<VendorOffersDisplayProps> = ({
  requestId,
  onOrderAccept,
  className
}) => {
  const [offers, setOffers] = useState<AggregatedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
    
    // Poll for new offers every 30 seconds
    const interval = setInterval(fetchOffers, 30000);
    return () => clearInterval(interval);
  }, [requestId]);

  const fetchOffers = async () => {
    try {
      const response = await fetch(`/api/requests?request_id=${requestId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }
      
      const data = await response.json();
      setOffers(data.offers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatQuantity = (value: number, unit: string) => {
    if (unit === 'kg' && value >= 1) {
      return `${value} kg`;
    } else if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(1)} kg`;
    } else if (unit === 'l' && value >= 1) {
      return `${value} l`;
    } else if (unit === 'ml' && value >= 1000) {
      return `${(value / 1000).toFixed(1)} l`;
    }
    return `${value} ${unit}`;
  };

  const getOfferTypeBadge = (offerType: string) => {
    switch (offerType) {
      case 'exact':
        return <Badge variant="default" className="text-xs">Exact</Badge>;
      case 'pack':
        return <Badge variant="secondary" className="text-xs">Pack</Badge>;
      case 'partial':
        return <Badge variant="destructive" className="text-xs">Partial</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{offerType}</Badge>;
    }
  };

  const handleAcceptOffer = async (vendorId: string, vendorOffers: AggregatedItemOffer[]) => {
    try {
      await onOrderAccept(vendorId, vendorOffers);
      setSelectedVendor(vendorId);
    } catch (error) {
      console.error('Error accepting offer:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading vendor offers...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Offers Yet</h3>
              <p className="text-muted-foreground mb-4">
                We're waiting for vendors to respond to your request.
              </p>
              <Button variant="outline" onClick={fetchOffers}>
                Refresh Offers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vendor Offers ({offers.length})</h2>
        <Button variant="outline" size="sm" onClick={fetchOffers}>
          Refresh
        </Button>
      </div>

      {offers.map((offer, index) => (
        <Card key={offer.vendor_id} className={`${selectedVendor === offer.vendor_id ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {offer.vendor_name}
                {index === 0 && (
                  <Badge variant="default" className="text-xs">Best Price</Badge>
                )}
              </CardTitle>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(offer.total_price, offer.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Vendor Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{offer.lead_time_minutes} min</span>
              </div>
              {offer.distance_km && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{offer.distance_km.toFixed(1)} km</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {offer.can_fulfill_completely ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
                <span>{offer.can_fulfill_completely ? 'Complete' : 'Partial'}</span>
              </div>
            </div>

            <Separator />

            {/* Item Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Item Breakdown:</h4>
              {offer.items.map((item) => (
                <div key={item.request_item_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{item.product_name}</span>
                      {getOfferTypeBadge(item.offer_type)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <div>Requested: {formatQuantity(item.requested_qty_value, item.requested_qty_unit)}</div>
                      <div>Offered: {formatQuantity(item.fulfillment_qty_value, item.fulfillment_qty_unit)}</div>
                      {item.surplus_qty_value && item.surplus_qty_unit && (
                        <div className="text-orange-600">
                          Surplus: {formatQuantity(item.surplus_qty_value, item.surplus_qty_unit)}
                        </div>
                      )}
                      {item.packs_needed && (
                        <div>Packs: {item.packs_needed} × {formatQuantity(item.pack_value || 0, item.pack_unit || 'pcs')}</div>
                      )}
                    </div>
                    
                    {item.notes && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatPrice(item.price_total, offer.currency)}
                    </div>
                    {item.price_per_unit && (
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(item.price_per_unit, offer.currency)}/{item.requested_qty_unit}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAcceptOffer(offer.vendor_id, offer.items)}
                className="flex-1"
                disabled={selectedVendor === offer.vendor_id}
              >
                {selectedVendor === offer.vendor_id ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Order Accepted
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Accept Offer
                  </>
                )}
              </Button>
              
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4" />
              </Button>
            </div>

            {/* Partial Fulfillment Warning */}
            {!offer.can_fulfill_completely && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Partial Fulfillment</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  This vendor cannot fulfill all items. You can accept partial fulfillment or wait for other offers.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};




