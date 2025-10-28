// API endpoint for user purchase insights
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // In production, fetch from database
    // For now, return mock insights based on user ID
    const insights = {
      userId,
      favoriteCategories: [
        { category: 'Grains', count: 5 },
        { category: 'Vegetables', count: 3 },
        { category: 'Dairy', count: 2 }
      ],
      frequentItems: [
        { itemName: 'Basmati Rice', frequency: 3, lastPurchased: new Date().toISOString() },
        { itemName: 'Onions', frequency: 2, lastPurchased: new Date().toISOString() },
        { itemName: 'Milk', frequency: 2, lastPurchased: new Date().toISOString() }
      ],
      preferredSources: [
        { source: 'bigbasket', count: 4 },
        { source: 'grofers', count: 3 },
        { source: 'amazon', count: 2 }
      ],
      averageOrderSize: 8.5,
      purchasePatterns: [],
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching user insights:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}





