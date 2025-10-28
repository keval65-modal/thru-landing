import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not initialized'
      }, { status: 500 });
    }

    // Test 1: Get vendors collection
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    const vendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Test 2: Check grocery-enabled vendors
    const groceryEnabledVendors = vendors.filter((vendor: any) => vendor.groceryEnabled);

    // Test 3: Check inventory data for first grocery-enabled vendor
    let inventoryData = false;
    if (groceryEnabledVendors.length > 0) {
      try {
        const inventorySnapshot = await getDocs(
          collection(db, 'vendors', groceryEnabledVendors[0].id, 'inventory')
        );
        inventoryData = inventorySnapshot.docs.length > 0;
      } catch (inventoryError) {
        console.log('No inventory data found');
      }
    }

    // Test 4: Check grocery-skus collection
    let grocerySkusCount = 0;
    try {
      const grocerySkusSnapshot = await getDocs(collection(db, 'grocery-skus'));
      grocerySkusCount = grocerySkusSnapshot.docs.length;
    } catch (skuError) {
      console.log('No grocery-skus collection found');
    }

    return NextResponse.json({
      success: true,
      firebaseConnection: true,
      vendorsFound: vendors.length,
      groceryEnabledVendors: groceryEnabledVendors.length,
      inventoryData,
      grocerySkusCount,
      sampleVendors: vendors.slice(0, 3).map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name || 'Unnamed Vendor',
        email: vendor.email,
        groceryEnabled: vendor.groceryEnabled || false
      }))
    });

  } catch (error) {
    console.error('Firebase test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


