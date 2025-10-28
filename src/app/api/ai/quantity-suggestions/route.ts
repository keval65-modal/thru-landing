// AI-powered quantity suggestions API
import { NextRequest, NextResponse } from 'next/server';
import { DynamicProduct } from '@/lib/scalable-grocery-ai-service';

export async function POST(request: NextRequest) {
  try {
    const { product } = await request.json();
    
    if (!product) {
      return NextResponse.json({ error: 'Product is required' }, { status: 400 });
    }

    const suggestions = await generateQuantitySuggestions(product);
    
    return NextResponse.json({
      suggestions,
      productName: product.name,
      category: product.category
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}

async function generateQuantitySuggestions(product: DynamicProduct) {
  const suggestions = [];
  
  // Get popular quantities from all sources
  const popularQuantities = product.availableQuantities
    .filter(q => q.isPopular)
    .slice(0, 3);
  
  suggestions.push(...popularQuantities.map(q => ({
    quantity: q.quantity,
    unit: q.unit,
    packSize: q.packSize,
    reason: "Most Popular",
    confidence: 0.9,
    source: q.source
  })));
  
  // AI-powered category-based suggestions
  const categorySuggestions = await getCategoryBasedSuggestions(product);
  suggestions.push(...categorySuggestions);
  
  // Price-based suggestions (best value)
  const valueSuggestions = getValueBasedSuggestions(product);
  suggestions.push(...valueSuggestions);
  
  // Remove duplicates and sort by confidence
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => 
      s.quantity === suggestion.quantity && s.unit === suggestion.unit
    )
  );
  
  return uniqueSuggestions
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 6);
}

async function getCategoryBasedSuggestions(product: DynamicProduct) {
  const suggestions = [];
  const category = product.category.toLowerCase();
  
  switch (category) {
    case "instant food":
    case "noodles":
    case "snacks":
      suggestions.push(
        { quantity: 1, unit: "pack", reason: "Try First", confidence: 0.8 },
        { quantity: 12, unit: "pack", reason: "Bulk Buy", confidence: 0.7 },
        { quantity: 24, unit: "pack", reason: "Family Stock", confidence: 0.6 }
      );
      break;
      
    case "grains":
    case "rice":
    case "pulses":
    case "dal":
      suggestions.push(
        { quantity: 1, unit: "kg", reason: "Weekly Use", confidence: 0.8 },
        { quantity: 5, unit: "kg", reason: "Monthly Stock", confidence: 0.9 },
        { quantity: 10, unit: "kg", reason: "Bulk Savings", confidence: 0.7 }
      );
      break;
      
    case "vegetables":
    case "fruits":
      suggestions.push(
        { quantity: 1, unit: "kg", reason: "Fresh Daily", confidence: 0.9 },
        { quantity: 2, unit: "kg", reason: "Family Size", confidence: 0.8 },
        { quantity: 5, unit: "kg", reason: "Weekly Stock", confidence: 0.6 }
      );
      break;
      
    case "dairy":
    case "milk":
    case "curd":
      suggestions.push(
        { quantity: 1, unit: "liter", reason: "Daily Use", confidence: 0.9 },
        { quantity: 2, unit: "liter", reason: "Family Size", confidence: 0.8 },
        { quantity: 500, unit: "ml", reason: "Single Use", confidence: 0.7 }
      );
      break;
      
    case "cooking oil":
    case "oil":
      suggestions.push(
        { quantity: 1, unit: "liter", reason: "Monthly Use", confidence: 0.8 },
        { quantity: 5, unit: "liter", reason: "Family Stock", confidence: 0.9 },
        { quantity: 15, unit: "liter", reason: "Bulk Buy", confidence: 0.7 }
      );
      break;
      
    case "spices":
    case "masala":
      suggestions.push(
        { quantity: 50, unit: "g", reason: "Try First", confidence: 0.8 },
        { quantity: 100, unit: "g", reason: "Regular Use", confidence: 0.9 },
        { quantity: 200, unit: "g", reason: "Family Size", confidence: 0.7 }
      );
      break;
      
    case "beverages":
    case "drinks":
      suggestions.push(
        { quantity: 1, unit: "bottle", reason: "Try First", confidence: 0.8 },
        { quantity: 6, unit: "bottle", reason: "Pack Deal", confidence: 0.9 },
        { quantity: 12, unit: "bottle", reason: "Bulk Buy", confidence: 0.7 }
      );
      break;
      
    default:
      // Generic suggestions
      suggestions.push(
        { quantity: 1, unit: "piece", reason: "Try First", confidence: 0.7 },
        { quantity: 2, unit: "piece", reason: "Family Size", confidence: 0.6 }
      );
  }
  
  return suggestions;
}

function getValueBasedSuggestions(product: DynamicProduct) {
  const suggestions = [];
  
  // Find the best value option (lowest price per unit)
  const quantitiesWithPrice = product.availableQuantities.filter(q => q.price);
  
  if (quantitiesWithPrice.length > 1) {
    // Calculate price per unit for each quantity
    const valueOptions = quantitiesWithPrice.map(q => ({
      ...q,
      pricePerUnit: q.price! / q.quantity
    }));
    
    // Sort by price per unit
    valueOptions.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    
    // Add the best value option
    const bestValue = valueOptions[0];
    suggestions.push({
      quantity: bestValue.quantity,
      unit: bestValue.unit,
      packSize: bestValue.packSize,
      reason: "Best Value",
      confidence: 0.8,
      source: bestValue.source
    });
  }
  
  return suggestions;
}





