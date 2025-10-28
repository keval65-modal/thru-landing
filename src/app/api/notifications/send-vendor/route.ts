import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { vendorId, orderId, orderData } = await req.json()

    if (!vendorId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get vendor's FCM token from database
    const db = adminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    const vendorDoc = await db.collection('vendors').doc(vendorId).get()
    
    if (!vendorDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const vendorData = vendorDoc.data()
    const fcmToken = vendorData?.fcmToken

    if (!fcmToken) {
      console.log(`Vendor ${vendorId} has no FCM token registered`)
      return NextResponse.json(
        { success: false, error: 'Vendor has no FCM token' },
        { status: 400 }
      )
    }

    // Send FCM notification
    const message = {
      token: fcmToken,
      notification: {
        title: 'New Order Received!',
        body: `Order #${orderId} - ${orderData?.items?.length || 0} items`,
      },
      data: {
        orderId: orderId,
        type: 'new_order',
        action: 'view_order',
        vendorId: vendorId,
        orderData: JSON.stringify(orderData)
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          priority: 'high' as const
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }

    // Import Firebase Admin Messaging
    const { getMessaging } = await import('firebase-admin/messaging')
    const messaging = getMessaging()

    const response = await messaging.send(message)
    
    console.log('FCM notification sent successfully:', response)

    return NextResponse.json({ 
      success: true, 
      messageId: response,
      message: 'Notification sent successfully'
    })

  } catch (error) {
    console.error('Error sending FCM notification:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
