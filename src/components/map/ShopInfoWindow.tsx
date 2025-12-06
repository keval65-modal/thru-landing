"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, Phone, Mail, Store } from 'lucide-react';
import { ShopMarkerData, ShopCategory } from '@/types/map-types';
import { getTodayHours } from '@/utils/operating-hours';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ShopInfoWindowProps {
  shop: ShopMarkerData;
}

// Category labels and colors
const CATEGORY_INFO = {
  [ShopCategory.CAFE]: { label: 'Cafe', color: 'bg-amber-100 text-amber-800' },
  [ShopCategory.RESTAURANT]: { label: 'Restaurant', color: 'bg-orange-100 text-orange-800' },
  [ShopCategory.MEDICAL]: { label: 'Medical', color: 'bg-red-100 text-red-800' },
  [ShopCategory.GROCERY]: { label: 'Grocery', color: 'bg-green-100 text-green-800' },
  [ShopCategory.OTHER]: { label: 'Other', color: 'bg-gray-100 text-gray-800' }
};

export function ShopInfoWindow({ shop }: ShopInfoWindowProps) {
  const router = useRouter();
  const categoryInfo = CATEGORY_INFO[shop.category];
  const todayHours = getTodayHours(shop.operatingHours);

  const handlePlaceOrder = () => {
    // Navigate to the vendor's menu/shop page
    router.push(`/home?vendor=${shop.id}`);
  };

  return (
    <div className="p-3 min-w-[280px] max-w-[320px]">
      {/* Header with name and category */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-base leading-tight">{shop.name}</h3>
          <Badge className={`${categoryInfo.color} text-xs shrink-0`}>
            {categoryInfo.label}
          </Badge>
        </div>
        
        {/* Status badge */}
        <Badge 
          variant={shop.isOpen ? "default" : "secondary"}
          className={`text-xs ${shop.isOpen ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'}`}
        >
          {shop.isOpen ? 'Open Now' : 'Closed'}
        </Badge>
      </div>

      {/* Address */}
      {shop.address && (
        <div className="flex items-start gap-2 mb-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{shop.address}</span>
        </div>
      )}

      {/* Operating hours */}
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 shrink-0" />
        <span>{todayHours}</span>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-3">
        {shop.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            <span>{shop.phone}</span>
          </div>
        )}
        {shop.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            <span className="truncate">{shop.email}</span>
          </div>
        )}
      </div>

      {/* Action button */}
      <Button 
        onClick={handlePlaceOrder}
        disabled={!shop.isOpen}
        className="w-full"
        size="sm"
      >
        <Store className="h-4 w-4 mr-2" />
        {shop.isOpen ? 'Place Order' : 'Closed'}
      </Button>
    </div>
  );
}
