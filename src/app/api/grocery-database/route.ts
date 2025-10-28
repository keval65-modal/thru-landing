// API endpoint for grocery database management
import { NextRequest, NextResponse } from 'next/server';
import { groceryDatabaseService } from '@/lib/grocery-database-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }
        const searchResults = await groceryDatabaseService.searchItems(query, limit);
        return NextResponse.json({
          results: searchResults,
          totalResults: searchResults.length,
          query,
          timestamp: Date.now()
        });

      case 'popular':
        const popularItems = await groceryDatabaseService.getPopularItems(limit);
        return NextResponse.json({
          items: popularItems,
          totalResults: popularItems.length,
          timestamp: Date.now()
        });

      case 'category':
        if (!category) {
          return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 });
        }
        const categoryItems = await groceryDatabaseService.getItemsByCategory(category, limit);
        return NextResponse.json({
          items: categoryItems,
          totalResults: categoryItems.length,
          category,
          timestamp: Date.now()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Grocery database API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'add':
        const itemId = await groceryDatabaseService.addGroceryItem(data.item, data.userId);
        return NextResponse.json({
          success: true,
          itemId,
          message: 'Item added successfully'
        });

      case 'update':
        if (!data.itemId) {
          return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }
        await groceryDatabaseService.updateItem(data.itemId, data.updates);
        return NextResponse.json({
          success: true,
          message: 'Item updated successfully'
        });

      case 'initialize':
        await groceryDatabaseService.initializeWithSeedData();
        return NextResponse.json({
          success: true,
          message: 'Database initialized successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Grocery database POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




