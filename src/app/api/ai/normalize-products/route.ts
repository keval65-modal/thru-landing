// AI-powered product normalization API
import { NextRequest, NextResponse } from 'next/server';
import { DynamicProduct } from '@/lib/scalable-grocery-ai-service';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();
    
    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Products array is required' }, { status: 400 });
    }

    const normalizedProducts = await normalizeProducts(products);
    
    return NextResponse.json({
      normalizedProducts,
      originalCount: products.length,
      normalizedCount: normalizedProducts.length
    });
  } catch (error) {
    console.error('AI normalization error:', error);
    return NextResponse.json({ error: 'Failed to normalize products' }, { status: 500 });
  }
}

async function normalizeProducts(products: DynamicProduct[]): Promise<DynamicProduct[]> {
  // AI-powered normalization logic
  const normalizedMap = new Map<string, DynamicProduct>();
  
  for (const product of products) {
    // Generate a normalized key for deduplication
    const normalizedKey = generateNormalizedKey(product);
    
    if (normalizedMap.has(normalizedKey)) {
      // Merge with existing product
      const existing = normalizedMap.get(normalizedKey)!;
      const merged = mergeProducts(existing, product);
      normalizedMap.set(normalizedKey, merged);
    } else {
      // Add new product
      normalizedMap.set(normalizedKey, product);
    }
  }
  
  // Sort by confidence and popularity
  const normalizedProducts = Array.from(normalizedMap.values())
    .sort((a, b) => {
      // First by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Then by number of popular quantities
      const aPopular = a.availableQuantities.filter(q => q.isPopular).length;
      const bPopular = b.availableQuantities.filter(q => q.isPopular).length;
      
      return bPopular - aPopular;
    });
  
  return normalizedProducts;
}

function generateNormalizedKey(product: DynamicProduct): string {
  // Create a normalized key for deduplication
  const name = product.name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  const brand = product.brand?.toLowerCase().replace(/[^\w\s]/g, '').trim() || '';
  
  return `${name}_${brand}`;
}

function mergeProducts(existing: DynamicProduct, newProduct: DynamicProduct): DynamicProduct {
  // Merge quantities from both products
  const mergedQuantities = [...existing.availableQuantities];
  
  for (const quantity of newProduct.availableQuantities) {
    const existingQuantity = mergedQuantities.find(q => 
      q.quantity === quantity.quantity && q.unit === quantity.unit
    );
    
    if (!existingQuantity) {
      mergedQuantities.push(quantity);
    } else {
      // Update with better price or source
      if (quantity.price && (!existingQuantity.price || quantity.price < existingQuantity.price)) {
        existingQuantity.price = quantity.price;
        existingQuantity.source = quantity.source;
      }
    }
  }
  
  // Sort quantities by popularity and price
  mergedQuantities.sort((a, b) => {
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;
    if (a.price && b.price) return a.price - b.price;
    return 0;
  });
  
  return {
    ...existing,
    availableQuantities: mergedQuantities,
    confidence: Math.max(existing.confidence, newProduct.confidence),
    // Keep the best image
    image: existing.image || newProduct.image,
    // Merge descriptions
    description: existing.description || newProduct.description
  };
}





