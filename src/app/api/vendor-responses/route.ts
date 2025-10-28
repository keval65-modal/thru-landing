import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import VendorOrderService from '@/lib/vendor-order-service'

// POST /api/vendor-responses - Handle vendor responses to orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, vendorId, vendorName, status, items, totalPrice, estimatedReadyTime, notes, counterOffer } = body

    // Validate required fields
    if (!orderId || !vendorId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: orderId, vendorId, status'
      }, { status: 400 })
    }

    const db = adminDb()
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not initialized'
      }, { status: 500 })
    }

    console.log('📨 Processing vendor response:', {
      orderId,
      vendorId,
      status,
      totalPrice,
      estimatedReadyTime
    })

    // Create vendor response document
    const vendorResponse = {
      orderId,
      vendorId,
      vendorName: vendorName || 'Unknown Vendor',
      status, // 'accepted', 'rejected', 'counter_offer'
      responseTime: new Date().toISOString(),
      items: items || [],
      totalPrice: totalPrice || 0,
      estimatedReadyTime: estimatedReadyTime || null,
      notes: notes || null,
      counterOffer: counterOffer || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save vendor response to Firestore
    const responseRef = await db.collection('vendor_responses').add(vendorResponse)
    console.log(`✅ Vendor response saved with ID: ${responseRef.id}`)

    // Update order status based on vendor response
    const vendorOrderService = new VendorOrderService()
    let orderStatus = 'pending'

    switch (status) {
      case 'accepted':
        orderStatus = 'accepted'
        break
      case 'rejected':
        orderStatus = 'rejected'
        break
      case 'counter_offer':
        orderStatus = 'counter_offer'
        break
      default:
        orderStatus = 'pending'
    }

    // Update order status
    await vendorOrderService.updateOrderStatus(orderId, orderStatus, vendorId)

    // If vendor accepted, update order with vendor details
    if (status === 'accepted') {
      await db.collection('groceryOrders').doc(orderId).update({
        selectedVendorId: vendorId,
        selectedVendorName: vendorName,
        totalPrice: totalPrice,
        estimatedReadyTime: estimatedReadyTime,
        status: 'accepted',
        updatedAt: new Date()
      })
    }

    // Send notification to user about vendor response
    await sendUserNotification(orderId, vendorId, vendorName, status, totalPrice)

    return NextResponse.json({
      success: true,
      message: 'Vendor response processed successfully',
      responseId: responseRef.id,
      orderStatus
    })

  } catch (error) {
    console.error('❌ Error processing vendor response:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/vendor-responses?orderId=xxx - Get vendor responses for an order
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: 'Missing orderId parameter'
      }, { status: 400 })
    }

    const vendorOrderService = new VendorOrderService()
    const responses = await vendorOrderService.getVendorResponses(orderId)

    return NextResponse.json({
      success: true,
      responses
    })

  } catch (error) {
    console.error('❌ Error getting vendor responses:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to send notification to user
async function sendUserNotification(orderId: string, vendorId: string, vendorName: string, status: string, totalPrice?: number) {
  try {
    // This would integrate with your FCM service to notify the user
    console.log(`📱 User notification: Order ${orderId} - ${vendorName} ${status}${totalPrice ? ` - ₹${totalPrice}` : ''}`)
    
    // TODO: Implement actual user notification via FCM
    // const fcmService = new FCMService()
    // await fcmService.sendUserNotification(userId, notification)
    
  } catch (error) {
    console.error('Error sending user notification:', error)
  }
}
