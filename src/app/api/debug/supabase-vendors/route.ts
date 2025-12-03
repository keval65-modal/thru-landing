import { NextResponse } from 'next/server';
import { SupabaseVendorService } from '@/lib/supabase/vendor-service';

export async function GET() {
  try {
    console.log('🔍 Checking Supabase vendors...');

    // Get all active vendors
    const allVendors = await SupabaseVendorService.getActiveVendors();
    
    console.log(`📊 Found ${allVendors.length} active vendors`);

    // Check for Zeo's Pizza
    const zeosPizza = allVendors.find(v => 
      v.name?.toLowerCase().includes('zeo') || 
      v.name?.toLowerCase().includes('pizza')
    );

    // Get grocery vendors
    const groceryVendors = allVendors.filter(v => 
      v.groceryEnabled || v.storeType === 'grocery'
    );

    // Calculate distances from test point (Pune)
    const testPoint = { lat: 18.5204, lng: 73.8567 };
    
    const vendorsWithDistance = allVendors.map(vendor => {
      let distance = null;
      if (vendor.location?.latitude && vendor.location?.longitude) {
        distance = calculateDistance(
          testPoint.lat,
          testPoint.lng,
          vendor.location.latitude,
          vendor.location.longitude
        );
      }
      
      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        storeType: vendor.storeType,
        isActive: vendor.isActive,
        groceryEnabled: vendor.groceryEnabled,
        location: vendor.location,
        distanceFromTestPoint: distance ? `${distance.toFixed(2)} km` : 'No location',
        createdAt: vendor.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalVendors: allVendors.length,
        groceryVendors: groceryVendors.length,
        zeosPizzaFound: !!zeosPizza,
        vendorsWithLocation: allVendors.filter(v => v.location?.latitude).length
      },
      zeosPizza: zeosPizza ? {
        id: zeosPizza.id,
        name: zeosPizza.name,
        storeType: zeosPizza.storeType,
        isActive: zeosPizza.isActive,
        groceryEnabled: zeosPizza.groceryEnabled,
        location: zeosPizza.location,
        distanceFromTestPoint: zeosPizza.location?.latitude ? 
          calculateDistance(
            testPoint.lat,
            testPoint.lng,
            zeosPizza.location.latitude,
            zeosPizza.location.longitude
          ).toFixed(2) + ' km' : 'No location'
      } : null,
      vendors: vendorsWithDistance,
      testPoint: {
        description: 'Pune test coordinates',
        latitude: testPoint.lat,
        longitude: testPoint.lng
      }
    });

  } catch (error) {
    console.error('❌ Error fetching vendors:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendors'
    }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}














