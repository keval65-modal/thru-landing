import { NextRequest, NextResponse } from 'next/server'
import { ProductionOrderService } from '@/lib/production-order-service'

/**
 * POST /api/orders/select-vendor
 * User selects the best vendor quote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, vendorId } = body

    if (!orderId || !vendorId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: orderId, vendorId'
      }, { status: 400 })
    }

    const result = await ProductionOrderService.selectVendorQuote(orderId, vendorId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor selected successfully. Order confirmed!',
      orderId,
      vendorId
    })

  } catch (error) {
    console.error('Error in select vendor API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
