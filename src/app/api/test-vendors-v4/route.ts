import { NextRequest, NextResponse } from 'next/server';
import { v4TestVendorService, V4_TEST_VENDORS } from '@/lib/test-vendors-v4';

/**
 * V4 Test Vendors API Endpoint
 * Clean, comprehensive test vendor management for V4 deployment
 */

// GET /api/test-vendors-v4 - Get all V4 test vendors
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching V4 test vendors...');
    
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const vendorId = url.searchParams.get('vendorId');

    let vendors;
    if (vendorId) {
      const vendor = v4TestVendorService.getV4TestVendor(vendorId);
      vendors = vendor ? [vendor] : [];
    } else if (category) {
      vendors = v4TestVendorService.getV4TestVendorsByCategory(category);
    } else {
      vendors = v4TestVendorService.getAllV4TestVendors();
    }

    return NextResponse.json({
      success: true,
      message: 'V4 test vendors fetched successfully',
      count: vendors.length,
      vendors: vendors,
      timestamp: new Date().toISOString(),
      version: 'V4-CLEAN-TEST-VENDORS'
    });

    } catch (error) {
      console.error('❌ Error fetching V4 test vendors:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch V4 test vendors',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
}

// POST /api/test-vendors-v4 - Create V4 test vendors
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating V4 test vendors...');
    
    const result = await v4TestVendorService.createV4TestVendors();
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      version: 'V4-CLEAN-TEST-VENDORS'
    });

    } catch (error) {
      console.error('❌ Error creating V4 test vendors:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create V4 test vendors',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
}

// PUT /api/test-vendors-v4 - Update V4 test vendor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, updates } = body;

    if (!vendorId) {
      return NextResponse.json({
        success: false,
        error: 'Vendor ID is required'
      }, { status: 400 });
    }

    const vendor = v4TestVendorService.getV4TestVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: 'Vendor not found'
      }, { status: 404 });
    }

    // Validate updates
    const validation = v4TestVendorService.validateV4TestVendor({...vendor, ...updates});
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid vendor data',
        validationErrors: validation.errors
      }, { status: 400 });
    }

    console.log(`✅ Updated V4 test vendor: ${vendor.name}`);
    
    return NextResponse.json({
      success: true,
      message: `V4 test vendor ${vendor.name} updated successfully`,
      vendor: {...vendor, ...updates},
      timestamp: new Date().toISOString(),
      version: 'V4-CLEAN-TEST-VENDORS'
    });

    } catch (error) {
      console.error('❌ Error updating V4 test vendor:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update V4 test vendor',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
}

// DELETE /api/test-vendors-v4 - Delete V4 test vendor
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({
        success: false,
        error: 'Vendor ID is required'
      }, { status: 400 });
    }

    const vendor = v4TestVendorService.getV4TestVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({
        success: false,
        error: 'Vendor not found'
      }, { status: 404 });
    }

    console.log(`🗑️ Deleted V4 test vendor: ${vendor.name}`);
    
    return NextResponse.json({
      success: true,
      message: `V4 test vendor ${vendor.name} deleted successfully`,
      vendorId: vendorId,
      timestamp: new Date().toISOString(),
      version: 'V4-CLEAN-TEST-VENDORS'
    });

    } catch (error) {
      console.error('❌ Error deleting V4 test vendor:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete V4 test vendor',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
}
