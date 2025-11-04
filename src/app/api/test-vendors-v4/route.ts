import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * V4 Test Vendors API Endpoint
 * Clean, comprehensive test vendor management for V4 deployment
 */

// GET /api/test-vendors-v4 - Get all V4 test vendors
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching vendors from Firestore...');

    if (!db) {
      return NextResponse.json({ success: false, error: 'Firebase not initialized' }, { status: 500 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const vendorId = url.searchParams.get('vendorId');

    const snapshot = await getDocs(collection(db, 'vendors'));
    let vendors = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

    if (vendorId) {
      vendors = vendors.filter((v: any) => v.id === vendorId);
    }
    if (category && category !== 'all') {
      vendors = vendors.filter((v: any) => Array.isArray(v.categories) && v.categories.includes(category));
    }

    // Prefer only active vendors for the public list
    vendors = vendors.filter((v: any) => v.isActiveOnThru === true || v.isActive === true || v.groceryEnabled === true);

    return NextResponse.json({
      success: true,
      message: 'Vendors fetched from Firestore',
      count: vendors.length,
      vendors,
      timestamp: new Date().toISOString(),
      source: 'firestore'
    });
  } catch (error) {
    console.error('❌ Error fetching vendors from Firestore:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vendors',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/test-vendors-v4 - Create V4 test vendors
// Management via this endpoint is disabled in production: vendors are sourced from Firestore.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Vendor creation disabled; use Firestore admin flows.' }, { status: 405 });
}

// PUT /api/test-vendors-v4 - Update V4 test vendor
export async function PUT() {
  return NextResponse.json({ success: false, error: 'Updates disabled on this endpoint.' }, { status: 405 });
}

// DELETE /api/test-vendors-v4 - Delete V4 test vendor
export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Deletion disabled on this endpoint.' }, { status: 405 });
}
