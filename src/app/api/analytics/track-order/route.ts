// API endpoint for tracking complete orders
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.userId || !orderData.orderId || !orderData.items || !Array.isArray(orderData.items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store order data (in production, use a proper database)
    const order = {
      ...orderData,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // In production, save to database
    console.log('Order tracked:', order);

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      message: 'Order tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500 });
  }
}





