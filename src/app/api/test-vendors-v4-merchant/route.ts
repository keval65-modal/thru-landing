import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching vendors from Firestore (merchant)...');

    const db = adminDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const vendorId = url.searchParams.get('vendorId');

    const snapshot = await db.collection('vendors').get();
    let vendors = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

    if (vendorId) {
      vendors = vendors.filter((v: any) => v.id === vendorId);
    }
    if (category && category !== 'all') {
      vendors = vendors.filter((v: any) => Array.isArray(v.categories) && v.categories.includes(category));
    }

    return NextResponse.json({
      success: true,
      message: 'Vendors fetched from Firestore',
      count: vendors.length,
      vendors,
      timestamp: new Date().toISOString(),
      source: 'firestore',
      domain: 'merchant.kiptech.in'
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

export async function POST() {
  return NextResponse.json({ 
    success: false, 
    error: 'Vendor creation disabled; use Firestore admin flows.' 
  }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Deletion disabled on this endpoint; use Firestore admin directly.' 
  }, { status: 405 });
}



