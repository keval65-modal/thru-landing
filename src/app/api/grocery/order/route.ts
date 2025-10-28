import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import VendorOrderService from '@/lib/vendor-order-service';

export async function POST(request: Request) {
  try {
    console.log('🚀🚀🚀 API ROUTE CALLED - V4 FORCE DEPLOY - 2024-10-21');
    const body = await request.json();
    const { items, route, detourPreferences, userId } = body;

    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin not initialized'
      }, { status: 500 });
    }

    console.log('🔥 Creating grocery order via API...');

    // Create the order data
    const orderData = {
      userId: userId || 'test_user_123',
      items: items || [
        { id: '1', name: 'Fresh Tomatoes', quantity: 2, unit: 'kg' },
        { id: '2', name: 'Whole Milk', quantity: 1, unit: 'liter' },
        { id: '3', name: 'White Bread', quantity: 2, unit: 'piece' }
      ],
      route: route || {
        startLocation: {
          latitude: 18.5204,
          longitude: 73.8567,
          address: 'NIBM Road, Pune'
        },
        endLocation: {
          latitude: 18.5300,
          longitude: 73.8700,
          address: 'Koregaon Park, Pune'
        },
        departureTime: new Date().toISOString()
      },
      detourPreferences: detourPreferences || {
        maxDetourKm: 5,
        maxDetourMinutes: 15
      },
      status: 'pending',
      createdAt: new Date()
    };

    // Create the order
    const orderRef = await db.collection('groceryOrders').add(orderData);
    console.log(`✅ Order created with ID: ${orderRef.id}`);

    // Find vendors along the route
    const vendorsSnapshot = await db.collection('vendors').get();
    const allVendors = vendorsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter grocery-enabled vendors (check both groceryEnabled flag and storeCategory)
    const groceryVendors = allVendors.filter((vendor: any) => 
      vendor.groceryEnabled === true || vendor.storeCategory === 'grocery'
    );
    console.log(`🛒 Found ${groceryVendors.length} grocery-enabled vendors`);

    // Filter vendors within detour distance
    const routeVendors = groceryVendors.filter((vendor: any) => {
      if (!vendor.location || !vendor.location.latitude || !vendor.location.longitude) {
        console.log(`❌ Vendor ${vendor.id} has no location data`);
        return false;
      }

      const distanceToStart = calculateDistance(
        orderData.route.startLocation.latitude,
        orderData.route.startLocation.longitude,
        vendor.location.latitude,
        vendor.location.longitude
      );

      const distanceToEnd = calculateDistance(
        orderData.route.endLocation.latitude,
        orderData.route.endLocation.longitude,
        vendor.location.latitude,
        vendor.location.longitude
      );

      const maxDetour = orderData.detourPreferences.maxDetourKm;
      const isWithinRange = distanceToStart <= maxDetour || distanceToEnd <= maxDetour;
      
      console.log(`📍 Vendor ${vendor.id} (${vendor.name || 'No name'}):`);
      console.log(`   Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
      console.log(`   Distance to start: ${distanceToStart.toFixed(2)}km`);
      console.log(`   Distance to end: ${distanceToEnd.toFixed(2)}km`);
      console.log(`   Max detour: ${maxDetour}km`);
      console.log(`   Within range: ${isWithinRange}`);

      return isWithinRange;
    });

    console.log(`📍 Found ${routeVendors.length} vendors along route`);

    // Send order to vendor app using the new service
    const vendorOrderService = new VendorOrderService();
    const transformedOrderData = vendorOrderService.transformOrderForVendor({
      id: orderRef.id,
      ...orderData
    });

    console.log('🚀🚀🚀 SENDING ORDER TO VENDOR APP (V4 - FORCE DEPLOY):', {
      orderId: orderRef.id,
      vendorApiUrl: 'https://merchant.kiptech.in/api',
      timestamp: new Date().toISOString(),
      version: 'V4-FORCE-DEPLOY-2024-10-21'
    });
    
    const vendorResult = await vendorOrderService.sendOrderToVendorApp(transformedOrderData);

    if (!vendorResult.success) {
      console.warn('⚠️ Failed to send order to vendor app:', vendorResult.error);
      // Continue with local notifications as fallback
      console.log('📬 Processing order locally with vendor notifications...');
    }

    // Create local vendor notifications as backup
    const notifications = [];
    for (const vendor of routeVendors) {
      try {
        const notification = {
          type: 'grocery_order',
          orderId: orderRef.id,
          vendorId: vendor.id,
          vendorName: (vendor as any).name || 'Unknown Vendor',
          items: orderData.items,
          route: orderData.route,
          createdAt: new Date(),
          status: 'pending',
          read: false
        };

        const notificationRef = await db.collection('vendor_notifications').add(notification);
        notifications.push({
          vendorId: vendor.id,
          vendorName: (vendor as any).name || 'Unknown Vendor',
          notificationId: notificationRef.id
        });

        console.log(`📬 Local notification created for vendor: ${(vendor as any).name || vendor.id}`);
      } catch (error) {
        console.error(`❌ Failed to create local notification for vendor ${vendor.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Grocery order created successfully! (V4 - FORCE DEPLOY - 2024-10-21)',
      orderId: orderRef.id,
      vendorsFound: routeVendors.length,
      notificationsSent: notifications.length,
      vendorAppSent: vendorResult.success,
      vendorAppError: vendorResult.error,
      deploymentVersion: 'V4-FORCE-DEPLOY-2024-10-21',
      timestamp: new Date().toISOString(),
      vendors: routeVendors.map((vendor: any) => ({
        id: vendor.id,
        name: (vendor as any).name || 'Unknown Vendor',
        email: vendor.email,
        location: vendor.location
      })),
      notifications: notifications
    });

  } catch (error) {
    console.error('❌ Error creating grocery order:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
