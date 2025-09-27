import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId') || 'zeos-pizza';
    
    console.log(`[Test API] Testing inventory fetch for vendor: ${vendorId}`);
    
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        message: 'Firestore not initialized' 
      }, { status: 500 });
    }

    // Test fetching from the sub-collection
    const inventoryRef = collection(db, "vendors", vendorId, "inventory");
    console.log(`[Test API] Fetching from collection: vendors/${vendorId}/inventory`);
    
    // Get all items first
    const allItemsQuery = query(inventoryRef);
    const allItemsSnapshot = await getDocs(allItemsQuery);
    console.log(`[Test API] Total items found: ${allItemsSnapshot.size}`);
    
    const allItems: any[] = [];
    allItemsSnapshot.forEach((doc) => {
      const data = doc.data();
      allItems.push({
        id: doc.id,
        ...data
      });
    });
    
    // Get filtered items
    const filteredQuery = query(inventoryRef, where("isAvailableOnThru", "==", true));
    const filteredSnapshot = await getDocs(filteredQuery);
    console.log(`[Test API] Filtered items (isAvailableOnThru=true): ${filteredSnapshot.size}`);
    
    const filteredItems: any[] = [];
    filteredSnapshot.forEach((doc) => {
      const data = doc.data();
      filteredItems.push({
        id: doc.id,
        ...data
      });
    });
    
    return NextResponse.json({
      success: true,
      vendorId,
      totalItems: allItemsSnapshot.size,
      filteredItems: filteredSnapshot.size,
      allItems: allItems.slice(0, 5), // Show first 5 items
      filteredItemsList: filteredItems.slice(0, 5) // Show first 5 filtered items
    });
    
  } catch (error: any) {
    console.error('[Test API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    }, { status: 500 });
  }
}
