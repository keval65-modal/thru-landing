// API endpoint for tracking purchases
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const purchaseData = await request.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'itemName', 'category', 'quantity', 'unit', 'source', 'orderId'];
    for (const field of requiredFields) {
      if (!purchaseData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Store purchase data (in production, use a proper database)
    const purchase = {
      ...purchaseData,
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // In production, save to database
    console.log('Purchase tracked:', purchase);

    return NextResponse.json({ 
      success: true, 
      purchaseId: purchase.id,
      message: 'Purchase tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking purchase:', error);
    return NextResponse.json({ error: 'Failed to track purchase' }, { status: 500 });
  }
}





