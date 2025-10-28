import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not initialized'
      }, { status: 500 });
    }

    console.log('🔥 Testing Firebase connection...');

    // Test 1: Get vendors collection
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    const vendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${vendors.length} vendors`);

    // Test 2: Check grocery-enabled vendors
    const groceryVendors = vendors.filter((vendor: any) => vendor.groceryEnabled);
    console.log(`🛒 Found ${groceryVendors.length} grocery-enabled vendors`);

    // Test 3: Check inventory for first grocery vendor
    let inventoryTest: { success: boolean; count: number; items: any[] } = { success: false, count: 0, items: [] };
    if (groceryVendors.length > 0) {
      const firstVendor = groceryVendors[0];
      try {
        const inventorySnapshot = await getDocs(
          collection(db, 'vendors', firstVendor.id, 'inventory')
        );
        inventoryTest = {
          success: true,
          count: inventorySnapshot.docs.length,
          items: inventorySnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            name: doc.data().product_name || doc.data().display_name,
            price: doc.data().price || 0
          }))
        };
      } catch (error) {
        console.log('❌ No inventory found for this vendor');
      }
    }

    // Test 4: Check grocery-skus collection
    let skusTest = { success: false, count: 0 };
    try {
      const skusSnapshot = await getDocs(collection(db, 'grocery-skus'));
      skusTest = {
        success: true,
        count: skusSnapshot.docs.length
      };
    } catch (error) {
      console.log('❌ No grocery-skus collection found');
    }

    return NextResponse.json({
      success: true,
      message: 'Firebase test completed successfully!',
      results: {
        vendors: {
          total: vendors.length,
          groceryEnabled: groceryVendors.length,
          sample: vendors.slice(0, 3).map((vendor: any) => ({
            id: vendor.id,
            name: vendor.name || 'Unnamed Vendor',
            email: vendor.email,
            groceryEnabled: vendor.groceryEnabled || false
          }))
        },
        inventory: inventoryTest,
        grocerySkus: skusTest
      }
    });

  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
