import { NextRequest, NextResponse } from 'next/server';
import { OrderCreationPayload } from '@/types/vendor-requests';
import { vendorNotificationService } from '@/lib/vendor-notification-service';
import { vendorManagementService } from '@/lib/vendor-management-service';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

// POST /api/orders - User accepts a vendor offer and creates an order
export async function POST(request: NextRequest) {
  try {
    const payload: OrderCreationPayload = await request.json();
    
    // Validate payload
    const validation = validateOrderPayload(payload);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid order payload', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    // Verify the request exists and is still active
    const requestQuery = query(
      collection(db, 'vendor_requests'), 
      where('request_id', '==', payload.request_id)
    );
    const requestSnapshot = await getDocs(requestQuery);
    
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
    
    // Verify vendor has responded to this request
    const responseQuery = query(
      collection(db, 'vendor_responses'),
      where('request_id', '==', payload.request_id),
      where('vendor_id', '==', payload.vendor_id)
    );
    const responseSnapshot = await getDocs(responseQuery);
    
    if (responseSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Vendor has not responded to this request' 
      }, { status: 400 });
    }
    
    // Create order
    const orderRef = await addDoc(collection(db, 'orders'), {
      ...payload,
      order_id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      status: 'pending_vendor_confirmation',
      payment_status: 'pending',
      delivery_status: 'pending'
    });
    
    // Update request status
    await updateDoc(doc(db, 'vendor_requests', requestDoc.id), {
      status: 'order_created',
      accepted_vendor_id: payload.vendor_id,
      order_id: orderRef.id,
      updated_at: new Date().toISOString()
    });
    
    // Notify vendor about the order
    await notifyVendorOfOrder(payload, orderRef.id);
    
    return NextResponse.json({ 
      success: true, 
      order_id: orderRef.id,
      order_status: 'pending_vendor_confirmation'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
      error: 'Failed to create order' 
    }, { status: 500 });
  }
}

// GET /api/orders/{order_id} - Get order details
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');
    
    if (!orderId) {
      return NextResponse.json({ 
        error: 'order_id parameter is required' 
      }, { status: 400 });
    }
    
    const orderQuery = query(
      collection(db, 'orders'), 
      where('order_id', '==', orderId)
    );
    const orderSnapshot = await getDocs(orderQuery);
    
    if (orderSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    const orderDoc = orderSnapshot.docs[0];
    const orderData = orderDoc.data();
    
    return NextResponse.json({
      order_id: orderData.order_id,
      request_id: orderData.request_id,
      vendor_id: orderData.vendor_id,
      total_amount: orderData.total_amount,
      currency: orderData.currency,
      status: orderData.status,
      payment_status: orderData.payment_status,
      delivery_status: orderData.delivery_status,
      created_at: orderData.created_at,
      accepted_offers: orderData.accepted_offers,
      delivery_address: orderData.delivery_address,
      notes: orderData.notes
    });
    
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch order' 
    }, { status: 500 });
  }
}

// PUT /api/orders/{order_id}/status - Update order status (vendor confirmation, etc.)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');
    const status = url.searchParams.get('status');
    
    if (!orderId || !status) {
      return NextResponse.json({ 
        error: 'order_id and status parameters are required' 
      }, { status: 400 });
    }
    
    const validStatuses = [
      'pending_vendor_confirmation',
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
    
    const orderQuery = query(
      collection(db, 'orders'), 
      where('order_id', '==', orderId)
    );
    const orderSnapshot = await getDocs(orderQuery);
    
    if (orderSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    const orderDoc = orderSnapshot.docs[0];
    await updateDoc(doc(db, 'orders', orderDoc.id), {
      status: status,
      updated_at: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true, 
      order_id: orderId,
      status: status
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ 
      error: 'Failed to update order status' 
    }, { status: 500 });
  }
}

// Helper function to validate order payload
function validateOrderPayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!payload.request_id || typeof payload.request_id !== 'string') {
    errors.push('request_id is required and must be a string');
  }
  
  if (!payload.vendor_id || typeof payload.vendor_id !== 'string') {
    errors.push('vendor_id is required and must be a string');
  }
  
  if (!Array.isArray(payload.accepted_offers) || payload.accepted_offers.length === 0) {
    errors.push('accepted_offers array is required and must not be empty');
  }
  
  if (typeof payload.total_amount !== 'number' || payload.total_amount <= 0) {
    errors.push('total_amount must be a positive number');
  }
  
  if (!payload.currency || typeof payload.currency !== 'string') {
    errors.push('currency is required');
  }
  
  for (const [index, offer] of payload.accepted_offers.entries()) {
    if (!offer.request_item_id || typeof offer.request_item_id !== 'string') {
      errors.push(`accepted_offers[${index}].request_item_id is required`);
    }
    
    if (!['exact_qty_offer', 'pack_offer'].includes(offer.offer_type)) {
      errors.push(`accepted_offers[${index}].offer_type must be 'exact_qty_offer' or 'pack_offer'`);
    }
    
    if (typeof offer.final_price !== 'number' || offer.final_price <= 0) {
      errors.push(`accepted_offers[${index}].final_price must be a positive number`);
    }
    
    if (typeof offer.final_qty_value !== 'number' || offer.final_qty_value <= 0) {
      errors.push(`accepted_offers[${index}].final_qty_value must be a positive number`);
    }
    
    if (!offer.final_qty_unit || typeof offer.final_qty_unit !== 'string') {
      errors.push(`accepted_offers[${index}].final_qty_unit is required`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Helper function to notify vendor about order
async function notifyVendorOfOrder(orderPayload: OrderCreationPayload, orderId: string) {
  try {
    console.log(`🔔 Notifying vendor ${orderPayload.vendor_id} about order ${orderId}`);
    
    // Get vendor details
    const vendor = await vendorManagementService.getVendor(orderPayload.vendor_id);
    if (!vendor) {
      console.error(`❌ Vendor ${orderPayload.vendor_id} not found`);
      return;
    }
    
    if (!vendor.fcmToken) {
      console.error(`❌ Vendor ${orderPayload.vendor_id} has no FCM token`);
      return;
    }
    
    // Send order confirmation notification
    await vendorNotificationService.sendOrderConfirmation(
      orderId,
      vendor.fcmToken,
      orderPayload
    );
    
    console.log(`✅ Order notification sent to vendor ${vendor.name}`);
    
  } catch (error) {
    console.error('❌ Error notifying vendor of order:', error);
    // Don't throw error - order should still be created even if notification fails
  }
}
