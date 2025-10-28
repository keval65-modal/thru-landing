import { NextRequest, NextResponse } from 'next/server';
import { vendorManagementService } from '@/lib/vendor-management-service';
import { vendorNotificationService } from '@/lib/vendor-notification-service';
import { adminDb } from '@/lib/firebaseAdmin';

// GET /api/vendors/{vendor_id}/orders - Get vendor's orders
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendor_id');
    const status = url.searchParams.get('status');
    
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
    
    // Build query
    const db = adminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    let ordersQuery = db.collection('orders')
      .where('vendor_id', '==', vendorId);
    
    if (status) {
      ordersQuery = ordersQuery.where('status', '==', status);
    }
    
    const ordersSnapshot = await ordersQuery.get();
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name
      },
      orders: orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch vendor orders' 
    }, { status: 500 });
  }
}

// PUT /api/vendors/{vendor_id}/orders/{order_id}/status - Update order status
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendor_id');
    const orderId = url.searchParams.get('order_id');
    
    if (!vendorId || !orderId) {
      return NextResponse.json({ 
        error: 'vendor_id and order_id parameters are required' 
      }, { status: 400 });
    }
    
    const { status, notes } = await request.json();
    
    const validStatuses = [
      'vendor_confirmed',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }
    
    // Verify vendor exists
    const vendor = await vendorManagementService.getVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({ 
        error: 'Vendor not found' 
      }, { status: 404 });
    }
    
    // Get order
    const db = adminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    const orderSnapshot = await db.collection('orders')
      .where('order_id', '==', orderId)
      .where('vendor_id', '==', vendorId)
      .get();
    
    if (orderSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    const orderDoc = orderSnapshot.docs[0];
    const orderData = orderDoc.data();
    
    // Update order status
    const updateDb = adminDb();
    if (!updateDb) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    await updateDb.collection('orders').doc(orderDoc.id).update({
      status: status,
      updated_at: new Date().toISOString(),
      ...(notes && { vendor_notes: notes })
    });
    
    // Send notification to user (if user has FCM token)
    if (orderData.user_fcm_token) {
      try {
        await vendorNotificationService.sendOrderStatusUpdate(
          orderData.user_fcm_token,
          orderId,
          status,
          vendor.name
        );
      } catch (error) {
        console.error('Failed to send status update notification:', error);
        // Don't fail the request if notification fails
      }
    }
    
    // Update vendor stats if order is completed
    if (status === 'delivered') {
      await vendorManagementService.updateVendorRating(vendorId, 5, 1); // Default 5-star rating
    }
    
    return NextResponse.json({ 
      success: true, 
      order_id: orderId,
      status: status,
      vendor_name: vendor.name
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ 
      error: 'Failed to update order status' 
    }, { status: 500 });
  }
}
