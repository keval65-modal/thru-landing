import { NextRequest, NextResponse } from 'next/server';
import { VendorRequestService } from '@/lib/vendor-request-service';
import { VendorResponsePayload } from '@/types/vendor-requests';
import { vendorManagementService } from '@/lib/vendor-management-service';
import { adminDb } from '@/lib/firebaseAdmin';

// POST /api/vendors/{vendor_id}/respond - Vendor responds to a request
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendor_id');
    
    if (!vendorId) {
      return NextResponse.json({ 
        error: 'vendor_id parameter is required' 
      }, { status: 400 });
    }
    
    const responsePayload: VendorResponsePayload = await request.json();
    
    // Validate payload
    const validation = VendorRequestService.validateResponsePayload(responsePayload);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid response payload', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    // Verify vendor exists and is active
    const vendor = await vendorManagementService.getVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({ 
        error: 'Vendor not found' 
      }, { status: 404 });
    }
    
    if (!vendor.isActive) {
      return NextResponse.json({ 
        error: 'Vendor is not active' 
      }, { status: 400 });
    }
    
    // Verify request exists
    const db = adminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    const requestSnapshot = await db.collection('vendor_requests')
      .where('request_id', '==', responsePayload.request_id)
      .get();
    
    if (requestSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Request not found' 
      }, { status: 404 });
    }
    
    const requestDoc = requestSnapshot.docs[0];
    const requestData = requestDoc.data();
    
    // Check if request is still pending
    if (requestData.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Request is no longer active' 
      }, { status: 400 });
    }
    
    // Store vendor response
    const responseDb = adminDb();
    if (!responseDb) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    const responseRef = await responseDb.collection('vendor_responses').add({
      ...responsePayload,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      submitted_at: new Date().toISOString()
    });
    
    // Update request with vendor response count
    const updateDb = adminDb();
    if (!updateDb) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    await updateDb.collection('vendor_requests').doc(requestDoc.id).update({
      vendor_responses: (requestData.vendor_responses || 0) + 1,
      updated_at: new Date().toISOString()
    });
    
    // Update vendor response time
    const responseTime = Math.round((Date.now() - new Date(requestData.created_at).getTime()) / (1000 * 60));
    await vendorManagementService.updateVendor(vendorId, {
      responseTime: responseTime
    });
    
    return NextResponse.json({ 
      success: true, 
      response_id: responseRef.id,
      vendor_name: vendor.name
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error processing vendor response:', error);
    return NextResponse.json({ 
      error: 'Failed to process vendor response' 
    }, { status: 500 });
  }
}

// GET /api/vendors/{vendor_id}/requests - Get pending requests for vendor
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendor_id');
    
    if (!vendorId) {
      return NextResponse.json({ 
        error: 'vendor_id parameter is required' 
      }, { status: 400 });
    }
    
    // Verify vendor exists
    const vendor = await vendorManagementService.getVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({ 
        error: 'Vendor not found' 
      }, { status: 404 });
    }
    
    // Get pending requests near vendor location
    const nearbyRequests = await vendorManagementService.findNearbyVendors(
      vendor.location,
      vendor.deliveryRadius,
      vendor.categories
    );
    
    // Get pending requests
    const requestsDb = adminDb();
    if (!requestsDb) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    const requestsSnapshot = await requestsDb.collection('vendor_requests')
      .where('status', '==', 'pending')
      .where('created_at', '>=', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    
    const requests = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        location: vendor.location,
        deliveryRadius: vendor.deliveryRadius,
        capabilities: vendor.capabilities
      },
      requests: requests,
      count: requests.length
    });
    
  } catch (error) {
    console.error('Error fetching vendor requests:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch vendor requests' 
    }, { status: 500 });
  }
}
