// API endpoint for personalized recommendations
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // In production, use AI/ML to generate personalized recommendations
    // For now, return mock recommendations based on user patterns
    const recommendations = [
      {
        itemName: 'Basmati Rice',
        category: 'Grains',
        reason: 'You buy this frequently',
        confidence: 0.9,
        suggestedQuantity: { quantity: 5, unit: 'kg', packSize: '5kg' }
      },
      {
        itemName: 'Fresh Onions',
        category: 'Vegetables',
        reason: 'Time to restock',
        confidence: 0.8,
        suggestedQuantity: { quantity: 2, unit: 'kg', packSize: '2kg' }
      },
      {
        itemName: 'Milk',
        category: 'Dairy',
        reason: 'Regular purchase',
        confidence: 0.7,
        suggestedQuantity: { quantity: 1, unit: 'liter', packSize: '1L' }
      }
    ];

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}





