import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin not initialized. Check environment variables.'
      }, { status: 500 });
    }

    console.log('🔄 Starting bulk vendor activation...');

    // Get all vendors
    const vendorsRef = db.collection('vendors');
    const snapshot = await vendorsRef.get();

    console.log(`📦 Found ${snapshot.size} vendors to process`);

    const batch = db.batch();
    let activatedCount = 0;
    const updates: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const vendorRef = vendorsRef.doc(doc.id);

      // Determine categories based on storeCategory or shop name
      let categories: string[] = [];
      const storeCategory = (data.storeCategory || '').toLowerCase();
      const shopName = (data.shopName || data.name || '').toLowerCase();

      // Determine categories based on storeCategory or name
      if (storeCategory.includes('cafe') || shopName.includes('cafe') || shopName.includes('coffee')) {
        categories = ['cafe', 'coffee_shop'];
      } else if (storeCategory.includes('pizza') || shopName.includes('pizza')) {
        categories = ['restaurant', 'pizza', 'fast_food', 'cafe'];
      } else if (storeCategory.includes('restaurant') || shopName.includes('restaurant')) {
        categories = ['restaurant'];
      } else if (storeCategory.includes('bakery') || shopName.includes('bakery')) {
        categories = ['bakery', 'cafe'];
      } else if (storeCategory.includes('grocery') || storeCategory.includes('supermarket')) {
        categories = ['grocery', 'supermarket'];
      } else if (storeCategory.includes('pharmacy') || storeCategory.includes('medical')) {
        categories = ['pharmacy', 'medical'];
      } else if (storeCategory.includes('bar') || storeCategory.includes('pub')) {
        categories = ['bar', 'pub', 'restaurant'];
      } else if (storeCategory.includes('bistro')) {
        categories = ['restaurant', 'cafe', 'bistro'];
      } else {
        // Default to restaurant/cafe for food-related shops
        categories = ['restaurant', 'cafe'];
      }

      // Normalize coordinates
      let coordinates = null;
      if (data.coordinates) {
        coordinates = data.coordinates;
      } else if (data.location?.latitude && data.location?.longitude) {
        coordinates = {
          lat: data.location.latitude,
          lng: data.location.longitude
        };
      }

      // Prepare update
      const updateData: any = {
        isActiveOnThru: true,
        categories: categories,
        updatedAt: new Date()
      };

      // Add normalized coordinates if they exist
      if (coordinates) {
        updateData.coordinates = coordinates;
      }

      batch.update(vendorRef, updateData);
      activatedCount++;

      updates.push({
        id: doc.id,
        name: data.shopName || data.name || 'Unknown',
        categories: categories,
        hasCoordinates: !!coordinates
      });
    });

    // Commit the batch update
    await batch.commit();

    console.log(`✅ Successfully activated ${activatedCount} vendors`);

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${activatedCount} vendors`,
      totalVendors: snapshot.size,
      activatedCount,
      updates
    });

  } catch (error) {
    console.error('❌ Error activating vendors:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


