import { NextRequest, NextResponse } from 'next/server'
import { ProductionOrderService } from '@/lib/production-order-service'

/**
 * POST /api/orders/create
 * Create a new production order (quote-based workflow)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, items, route, detourPreferences } = body

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

    // Create order
    const result = await ProductionOrderService.createOrder({
      userId,
      items,
      route,
      detourPreferences: detourPreferences || {
        maxDetourKm: 5,
        maxDetourMinutes: 15
      }
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      message: 'Order created successfully. Waiting for vendor quotes.',
      status: 'pending_quotes'
    })

  } catch (error) {
    console.error('Error in create order API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

