import { NextRequest, NextResponse } from 'next/server';
import { vendorManagementService } from '@/lib/vendor-management-service';

// POST /api/setup/sample-vendors - Create sample vendors for testing
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating sample vendors...');
    
    // Create sample vendors
    await vendorManagementService.createSampleVendors();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sample vendors created successfully' 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating sample vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to create sample vendors' 
    }, { status: 500 });
  }
}

// GET /api/setup/sample-vendors - Check if sample vendors exist
export async function GET(request: NextRequest) {
  try {
    // Check if vendors exist by trying to find vendors near Bangalore
    const vendors = await vendorManagementService.findNearbyVendors(
      { lat: 12.9716, lng: 77.5946 }, // Bangalore center
      50, // Large radius to catch all vendors
      ['grocery']
    );
    
    return NextResponse.json({
      vendors_exist: vendors.length > 0,
      vendor_count: vendors.length,
      vendors: vendors.map(v => ({
        id: v.id,
        name: v.name,
        location: v.location.address,
        isActive: v.isActive
      }))
    });
    
  } catch (error) {
    console.error('Error checking sample vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to check sample vendors' 
    }, { status: 500 });
  }
}




