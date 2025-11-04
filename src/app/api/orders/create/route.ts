import { NextRequest, NextResponse } from 'next/server'
import { SupabaseOrderService } from '@/lib/supabase/order-service'

/**
 * POST /api/orders/create
 * Create a new production order (quote-based workflow)
 * NOW USING SUPABASE! 🎉
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, items, route, detourPreferences } = body

    console.log('📝 Creating order in Supabase:', { userId, itemCount: items?.length })

    // Validate required fields
    if (!userId || !items || !route) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, items, route'
      }, { status: 400 })
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Items must be a non-empty array'
      }, { status: 400 })
    }

    // Create order in Supabase
    const result = await SupabaseOrderService.createOrder({
      userId,
      items,
      route,
      detourPreferences: detourPreferences || {
        maxDetourDistance: 5,
        preferredStoreTypes: ['grocery'],
        singleStorePreferred: true
      }
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    console.log('✅ Order created in Supabase:', result.orderId)

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      message: 'Order created in Supabase successfully! Waiting for vendor quotes.',
      status: 'pending_quotes',
      database: 'supabase'
    })

  } catch (error) {
    console.error('❌ Error in create order API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}



