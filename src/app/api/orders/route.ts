import { NextRequest, NextResponse } from 'next/server';
import { SupabaseOrderService } from '@/lib/supabase/order-service';

// GET /api/orders - Get orders (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const orderId = url.searchParams.get('orderId');
    
    console.log('📋 Fetching orders from Supabase:', { userId, orderId });

    if (orderId) {
      // Get single order
      const order = await SupabaseOrderService.getOrder(orderId);
      
      if (!order) {
        return NextResponse.json({ 
          success: false,
          error: 'Order not found' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order,
        database: 'supabase'
      });
    }

    if (userId) {
      // Get user's orders
      const orders = await SupabaseOrderService.getUserOrders(userId);
      
      console.log(`✅ Found ${orders.length} orders for user ${userId}`);

      return NextResponse.json({
        success: true,
        orders,
        count: orders.length,
        database: 'supabase'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'userId or orderId parameter is required'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders'
    }, { status: 500 });
  }
}
