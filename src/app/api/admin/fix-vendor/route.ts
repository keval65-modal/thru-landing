import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { vendorId } = await request.json();

    if (!vendorId) {
      return NextResponse.json({
        success: false,
        error: 'Vendor ID is required'
      }, { status: 400 });
    }

    const db = await adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Get the vendor
    const vendorRef = db.collection('vendors').doc(vendorId);
    const vendorDoc = await vendorRef.get();

    if (!vendorDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Vendor not found'
      }, { status: 404 });
    }

    const vendorData = vendorDoc.data();

    // Determine categories based on storeCategory
    let categories: string[] = [];
    const storeCategory = vendorData?.storeCategory?.toLowerCase() || '';

    if (storeCategory.includes('cafe') || storeCategory.includes('coffee')) {
      categories = ['cafe', 'coffee_shop'];
    } else if (storeCategory.includes('restaurant')) {
      categories = ['restaurant'];
    } else if (storeCategory.includes('pizza')) {
      categories = ['restaurant', 'pizza', 'fast_food'];
    } else if (storeCategory.includes('bakery')) {
      categories = ['bakery'];
    } else if (storeCategory.includes('grocery') || storeCategory.includes('supermarket')) {
      categories = ['grocery', 'supermarket'];
    } else if (storeCategory.includes('pharmacy') || storeCategory.includes('medical')) {
      categories = ['pharmacy', 'medical'];
    } else {
      // Default based on name
      const name = (vendorData?.shopName || vendorData?.name || '').toLowerCase();
      if (name.includes('pizza')) {
        categories = ['restaurant', 'pizza', 'fast_food', 'cafe'];
      } else if (name.includes('cafe') || name.includes('coffee')) {
        categories = ['cafe', 'coffee_shop'];
      } else {
        categories = ['restaurant'];
      }
    }

    // Update vendor with required fields
    await vendorRef.update({
      isActiveOnThru: true,
      categories: categories,
      updatedAt: new Date()
    });

    console.log(`✅ Fixed vendor ${vendorId}:`, {
      isActiveOnThru: true,
      categories
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor updated successfully',
      updates: {
        isActiveOnThru: true,
        categories
      }
    });

  } catch (error) {
    console.error('❌ Error fixing vendor:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

