import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * DELETE /api/admin/cleanup-test-data
 * Removes all test data from Firestore
 */
export async function DELETE() {
  try {
    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not initialized'
      }, { status: 500 });
    }

    console.log('🧹 Starting cleanup...');
    const results = {
      groceryOrders: 0,
      vendorResponses: 0,
      oldOrders: 0
    };

    // 1. Clean up test groceryOrders
    const testOrders = await db.collection('groceryOrders')
      .where('userId', '==', 'test_user_123')
      .get();
    
    for (const doc of testOrders.docs) {
      await doc.ref.delete();
      results.groceryOrders++;
    }
    console.log(`✅ Deleted ${results.groceryOrders} test grocery orders`);

    // 2. Clean up orphaned vendor responses
    const allResponses = await db.collection('vendor_responses').get();
    
    for (const doc of allResponses.docs) {
      const data = doc.data();
      const orderRef = await db.collection('groceryOrders').doc(data.orderId).get();
      if (!orderRef.exists) {
        await doc.ref.delete();
        results.vendorResponses++;
      }
    }
    console.log(`✅ Deleted ${results.vendorResponses} orphaned responses`);

    // 3. Clean up old test orders collection
    const testOrdersOld = await db.collection('orders')
      .where('customerInfo.email', '==', 'test@example.com')
      .get();
    
    for (const doc of testOrdersOld.docs) {
      await doc.ref.delete();
      results.oldOrders++;
    }
    console.log(`✅ Deleted ${results.oldOrders} old test orders`);

    const total = results.groceryOrders + results.vendorResponses + results.oldOrders;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${total} test records`,
      details: results,
      total
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/cleanup-test-data
 * Get count of test data without deleting
 */
export async function GET() {
  try {
    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not initialized'
      }, { status: 500 });
    }

    const counts = {
      groceryOrders: 0,
      vendorResponses: 0,
      oldOrders: 0
    };

    // Count test groceryOrders
    const testOrders = await db.collection('groceryOrders')
      .where('userId', '==', 'test_user_123')
      .get();
    counts.groceryOrders = testOrders.size;

    // Count orphaned vendor responses
    const allResponses = await db.collection('vendor_responses').get();
    for (const doc of allResponses.docs) {
      const data = doc.data();
      const orderRef = await db.collection('groceryOrders').doc(data.orderId).get();
      if (!orderRef.exists) {
        counts.vendorResponses++;
      }
    }

    // Count old test orders
    const testOrdersOld = await db.collection('orders')
      .where('customerInfo.email', '==', 'test@example.com')
      .get();
    counts.oldOrders = testOrdersOld.size;

    const total = counts.groceryOrders + counts.vendorResponses + counts.oldOrders;

    return NextResponse.json({
      success: true,
      counts,
      total,
      message: total > 0 ? `Found ${total} test records to clean` : 'No test data found'
    });

  } catch (error) {
    console.error('❌ Count error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Count failed'
    }, { status: 500 });
  }
}



