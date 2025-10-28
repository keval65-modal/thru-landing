import { NextRequest, NextResponse } from 'next/server';
import { vendorManagementService, VendorProfile } from '@/lib/vendor-management-service';
import { vendorNotificationService } from '@/lib/vendor-notification-service';

// POST /api/vendors/register - Register a new vendor
export async function POST(request: NextRequest) {
  try {
    const vendorData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'location', 'fcmToken'];
    const missingFields = requiredFields.filter(field => !vendorData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      }, { status: 400 });
    }
    
    // Register vendor
    const vendor = await vendorManagementService.registerVendor({
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone,
      location: vendorData.location,
      fcmToken: vendorData.fcmToken,
      isActive: true,
      categories: vendorData.categories || ['grocery'],
      deliveryRadius: vendorData.deliveryRadius || 5,
      operatingHours: vendorData.operatingHours || {
        open: '09:00',
        close: '21:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      capabilities: vendorData.capabilities || {
        fractionalSales: false,
        packSplitting: false,
        minOrderValue: 50
      },
      rating: 5.0,
      totalOrders: 0,
      responseTime: 30
    });
    
    return NextResponse.json({ 
      success: true, 
      vendor_id: vendor.id,
      vendor: vendor
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error registering vendor:', error);
    return NextResponse.json({ 
      error: 'Failed to register vendor' 
    }, { status: 500 });
  }
}

// GET /api/vendors - Get vendors (with optional filtering)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location');
    const radius = url.searchParams.get('radius');
    const categories = url.searchParams.get('categories');
    
    if (location) {
      // Parse location (format: "lat,lng")
      const [lat, lng] = location.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ 
          error: 'Invalid location format. Use "lat,lng"' 
        }, { status: 400 });
      }
      
      const nearbyVendors = await vendorManagementService.findNearbyVendors(
        { lat, lng },
        radius ? parseInt(radius) : 10,
        categories ? categories.split(',') : ['grocery']
      );
      
      return NextResponse.json({
        vendors: nearbyVendors,
        count: nearbyVendors.length
      });
    }
    
    // Return all vendors (for admin purposes)
    return NextResponse.json({ 
      error: 'Location parameter required' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch vendors' 
    }, { status: 500 });
  }
}

// PUT /api/vendors/{vendor_id} - Update vendor profile
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendor_id');
    
    if (!vendorId) {
      return NextResponse.json({ 
        error: 'vendor_id parameter is required' 
      }, { status: 400 });
    }
    
    const updates = await request.json();
    
    // Update vendor
    await vendorManagementService.updateVendor(vendorId, updates);
    
    return NextResponse.json({ 
      success: true, 
      vendor_id: vendorId
    });
    
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ 
      error: 'Failed to update vendor' 
    }, { status: 500 });
  }
}




