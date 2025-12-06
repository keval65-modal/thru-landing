"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SupabaseVendorService, Vendor } from '@/lib/supabase/vendor-service';
import { ShopCategory } from '@/types/map-types';
import RouteSelector from '@/components/vendor/RouteSelector';
import RestaurantMenu from '@/components/vendor/RestaurantMenu';
import GroceryItemEntry from '@/components/vendor/GroceryItemEntry';
import BottomNav from '@/components/layout/bottom-nav';

interface RouteData {
  departureTime: Date;
  destination: string;
  destinationCoords: { lat: number; lng: number };
}

export default function VendorOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'route' | 'menu' | 'items'>('route');
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Determine vendor type
  const isGrocery = vendor?.categories?.some(cat => 
    cat.toLowerCase().includes('grocery') || 
    cat.toLowerCase().includes('supermarket')
  );

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  async function loadVendor() {
    try {
      setLoading(true);
      const vendors = await SupabaseVendorService.getActiveVendors();
      const vendorData = vendors.find(v => v.id === vendorId);
      
      if (!vendorData) {
        setError('Vendor not found');
        return;
      }

      setVendor(vendorData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading vendor:', err);
      setError('Failed to load vendor details');
      setLoading(false);
    }
  }

  function handleRouteSet(route: RouteData) {
    setRouteData(route);
    setStep(isGrocery ? 'items' : 'menu');
    
    toast({
      title: 'Route Set',
      description: 'You can now proceed with your order',
    });
  }

  function handleBack() {
    if (step === 'menu' || step === 'items') {
      setStep('route');
    } else {
      router.push('/map');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading vendor...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Vendor not found'}</p>
          <Button onClick={() => router.push('/map')}>
            Back to Map
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{vendor.name}</h1>
              <p className="text-sm text-gray-600">{vendor.address}</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-1 rounded-full ${step === 'route' ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1 rounded-full ${step === 'menu' || step === 'items' ? 'bg-primary' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {step === 'route' && (
          <RouteSelector
            vendor={vendor}
            onRouteSet={handleRouteSet}
          />
        )}

        {step === 'menu' && !isGrocery && routeData && (
          <RestaurantMenu
            vendor={vendor}
            routeData={routeData}
          />
        )}

        {step === 'items' && isGrocery && routeData && (
          <GroceryItemEntry
            vendor={vendor}
            routeData={routeData}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
