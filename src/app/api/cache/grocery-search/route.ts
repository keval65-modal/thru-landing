// Cache API for grocery search results
import { NextRequest, NextResponse } from 'next/server';
import { DynamicProduct } from '@/lib/scalable-grocery-ai-service';

// In-memory cache (in production, use Redis or similar)
const cache = new Map<string, { products: DynamicProduct[], timestamp: number }>();

// Cache clear endpoint for v4 deployment
export async function DELETE(request: NextRequest) {
  try {
    cache.clear();
    console.log('🧹 Cache cleared for V4 deployment');
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully for V4 deployment',
      clearedAt: Date.now(),
      version: 'V4-CACHE-CLEAR'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, products, timestamp } = await request.json();
    
    if (!query || !products) {
      return NextResponse.json({ error: 'Query and products are required' }, { status: 400 });
    }
    
    cache.set(query.toLowerCase(), {
      products,
      timestamp: timestamp || Date.now()
    });
    
    return NextResponse.json({ success: true, cachedAt: Date.now() });
  } catch (error) {
    console.error('Cache storage error:', error);
    return NextResponse.json({ error: 'Failed to cache results' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  try {
    const cached = cache.get(query.toLowerCase());
    
    if (!cached) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // Check if cache is still valid (1 hour)
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > 3600000) {
      cache.delete(query.toLowerCase());
      return NextResponse.json({ error: 'Cache expired' }, { status: 404 });
    }
    
    return NextResponse.json({
      products: cached.products,
      timestamp: cached.timestamp,
      cacheAge: cacheAge
    });
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve cache' }, { status: 500 });
  }
}





