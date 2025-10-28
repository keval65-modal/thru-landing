/**
 * Cleanup Script - Remove All Test Data from Firestore
 * 
 * This script cleans up:
 * - Test orders from groceryOrders collection
 * - Test vendor responses
 * - Test users (starting with test_)
 * 
 * Run: npx ts-node scripts/cleanup-test-data.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  try {
    // 1. Clean up test groceryOrders
    console.log('📦 Cleaning groceryOrders collection...');
    const groceryOrdersRef = db.collection('groceryOrders');
    const testOrders = await groceryOrdersRef
      .where('userId', '==', 'test_user_123')
      .get();
    
    const orderBatch = db.batch();
    let orderCount = 0;
    testOrders.forEach(doc => {
      orderBatch.delete(doc.ref);
      orderCount++;
    });
    
    if (orderCount > 0) {
      await orderBatch.commit();
      console.log(`✅ Deleted ${orderCount} test grocery orders\n`);
    } else {
      console.log('✅ No test grocery orders found\n');
    }

    // 2. Clean up vendor_responses
    console.log('📨 Cleaning vendor_responses collection...');
    const responsesRef = db.collection('vendor_responses');
    const allResponses = await responsesRef.get();
    
    const responseBatch = db.batch();
    let responseCount = 0;
    
    for (const doc of allResponses.docs) {
      const data = doc.data();
      // Delete if it's a test order
      const orderRef = await db.collection('groceryOrders').doc(data.orderId).get();
      if (!orderRef.exists) {
        // Order doesn't exist anymore, clean up response
        responseBatch.delete(doc.ref);
        responseCount++;
      }
    }
    
    if (responseCount > 0) {
      await responseBatch.commit();
      console.log(`✅ Deleted ${responseCount} orphaned vendor responses\n`);
    } else {
      console.log('✅ No orphaned vendor responses found\n');
    }

    // 3. Clean up test orders collection (if exists)
    console.log('📋 Cleaning orders collection...');
    const ordersRef = db.collection('orders');
    const testOrdersOld = await ordersRef
      .where('customerInfo.email', '==', 'test@example.com')
      .get();
    
    const oldOrderBatch = db.batch();
    let oldOrderCount = 0;
    testOrdersOld.forEach(doc => {
      oldOrderBatch.delete(doc.ref);
      oldOrderCount++;
    });
    
    if (oldOrderCount > 0) {
      await oldOrderBatch.commit();
      console.log(`✅ Deleted ${oldOrderCount} test orders from old collection\n`);
    } else {
      console.log('✅ No test orders in old collection\n');
    }

    // 4. Summary
    console.log('🎉 Cleanup completed!');
    console.log('═'.repeat(50));
    console.log(`Total cleaned:`);
    console.log(`  - Grocery Orders: ${orderCount}`);
    console.log(`  - Vendor Responses: ${responseCount}`);
    console.log(`  - Old Orders: ${oldOrderCount}`);
    console.log(`  - Total: ${orderCount + responseCount + oldOrderCount}`);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run cleanup
cleanupTestData()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });

