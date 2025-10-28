import { NextRequest, NextResponse } from 'next/server';
import { vendorManagementService } from '@/lib/vendor-management-service';
import { adminDb } from '@/lib/firebaseAdmin';

// POST /api/setup/pune-vendors - Create 5 dummy vendors in Pune
export async function POST(request: NextRequest) {
  try {
    console.log('🏪 Creating Pune vendors...');
    
    const puneVendors = [
      // Grocery Vendors
      {
        name: "NIBM Fresh Mart",
        email: "groc1@mail.com",
        password: "qwerty",
        phone: "+919876543201",
        location: {
          lat: 18.5204,
          lng: 73.8567,
          address: "NIBM Road, Kondhwa, Pune"
        },
        fcmToken: "fcm_token_groc1",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 5,
        operatingHours: {
          open: "06:00",
          close: "22:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: true,
          packSplitting: true,
          splitFeePercent: 10,
          minOrderValue: 50
        },
        rating: 4.5,
        totalOrders: 120,
        responseTime: 15
      },
      {
        name: "Camp Grocery Store",
        email: "groc2@mail.com",
        password: "qwerty",
        phone: "+919876543202",
        location: {
          lat: 18.5204,
          lng: 73.8567,
          address: "Camp Area, Pune"
        },
        fcmToken: "fcm_token_groc2",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 3,
        operatingHours: {
          open: "07:00",
          close: "21:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: false,
          packSplitting: false,
          minOrderValue: 100
        },
        rating: 4.2,
        totalOrders: 89,
        responseTime: 25
      },
      {
        name: "Kondhwa Supermarket",
        email: "groc3@mail.com",
        password: "qwerty",
        phone: "+919876543203",
        location: {
          lat: 18.5204,
          lng: 73.8567,
          address: "Kondhwa, Pune"
        },
        fcmToken: "fcm_token_groc3",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 7,
        operatingHours: {
          open: "08:00",
          close: "23:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: true,
          packSplitting: true,
          splitFeePercent: 5,
          minOrderValue: 75
        },
        rating: 4.7,
        totalOrders: 234,
        responseTime: 12
      },
      // Restaurant Vendors
      {
        name: "NIBM Food Court",
        email: "rest1@mail.com",
        password: "qwerty",
        phone: "+919876543204",
        location: {
          lat: 18.5204,
          lng: 73.8567,
          address: "NIBM Road, Pune"
        },
        fcmToken: "fcm_token_rest1",
        isActive: true,
        categories: ["food"],
        deliveryRadius: 4,
        operatingHours: {
          open: "10:00",
          close: "23:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: false,
          packSplitting: false,
          minOrderValue: 150
        },
        rating: 4.3,
        totalOrders: 156,
        responseTime: 20
      },
      {
        name: "Camp Restaurant",
        email: "rest2@mail.com",
        password: "qwerty",
        phone: "+919876543205",
        location: {
          lat: 18.5204,
          lng: 73.8567,
          address: "Camp Area, Pune"
        },
        fcmToken: "fcm_token_rest2",
        isActive: true,
        categories: ["food"],
        deliveryRadius: 6,
        operatingHours: {
          open: "11:00",
          close: "22:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: false,
          packSplitting: false,
          minOrderValue: 200
        },
        rating: 4.6,
        totalOrders: 189,
        responseTime: 18
      }
    ];

    const createdVendors = [];
    
    for (const vendor of puneVendors) {
      try {
        // Register vendor in our system
        const registeredVendor = await vendorManagementService.registerVendor(vendor);
        
        // Create Firebase Auth user
        const { adminAuth } = await import('@/lib/firebaseAdmin');
        const auth = adminAuth();
        if (!auth) {
          console.error('Firebase Admin Auth not available');
          continue;
        }
        
        const userRecord = await auth.createUser({
          email: vendor.email,
          password: vendor.password,
          displayName: vendor.name,
          phoneNumber: vendor.phone
        });
        
        // Set custom claims after user creation
        await auth.setCustomUserClaims(userRecord.uid, {
          vendorId: registeredVendor.id,
          role: 'vendor',
          categories: vendor.categories
        });
        
        // Update vendor with Firebase UID
        await vendorManagementService.updateVendor(registeredVendor.id, {
          firebaseUid: userRecord.uid
        });
        
        createdVendors.push({
          id: registeredVendor.id,
          firebaseUid: userRecord.uid,
          email: vendor.email,
          password: vendor.password,
          name: vendor.name,
          location: vendor.location.address,
          categories: vendor.categories
        });
        
        console.log(`✅ Created vendor: ${vendor.name} (${vendor.email})`);
      } catch (error) {
        console.error(`❌ Failed to create vendor ${vendor.name}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pune vendors created successfully',
      vendors: createdVendors,
      vendorCount: createdVendors.length
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating Pune vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to create Pune vendors' 
    }, { status: 500 });
  }
}

// GET /api/setup/pune-vendors - Get created vendors
export async function GET(request: NextRequest) {
  try {
    // Get vendors near Pune
    const vendors = await vendorManagementService.findNearbyVendors(
      { lat: 18.5204, lng: 73.8567 }, // Pune center
      50, // Large radius to catch all vendors
      ['grocery', 'food']
    );
    
    return NextResponse.json({
      vendors_exist: vendors.length > 0,
      vendor_count: vendors.length,
      vendors: vendors.map(v => ({
        id: v.id,
        email: v.email,
        name: v.name,
        location: v.location.address,
        categories: v.categories,
        isActive: v.isActive,
        rating: v.rating,
        totalOrders: v.totalOrders
      }))
    });
    
  } catch (error) {
    console.error('Error fetching Pune vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Pune vendors' 
    }, { status: 500 });
  }
}