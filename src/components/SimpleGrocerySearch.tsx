import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleGrocerySearchProps {
  onItemAdd: (item: { name: string; unit: string; quantity: number }) => void;
  className?: string;
}

// AI-powered unit detection function
const detectUnit = async (itemName: string): Promise<string> => {
  try {
    // For now, we'll use a simple rule-based approach
    // In production, this would call Gemini/OpenAI API
    const item = itemName.toLowerCase();
    
    // Packaged items (check first to avoid conflicts)
    if (item.includes('chocolate') || item.includes('biscuit') || item.includes('cookies') ||
        item.includes('chips') || item.includes('crackers') || item.includes('snacks') ||
        item.includes('candy') || item.includes('sweets') || item.includes('toffee') ||
        item.includes('maggi') || item.includes('noodles') || item.includes('pasta') ||
        item.includes('bread') || item.includes('cake') || item.includes('muffin')) {
      return 'packet';
    }
    
    // Dairy products (more specific)
    if ((item.includes('milk') && !item.includes('chocolate') && !item.includes('powder')) ||
        item.includes('yogurt') || item.includes('curd') || item.includes('butter') ||
        item.includes('cheese') || item.includes('paneer')) {
      return 'liter';
    }
    
    // Liquid items (excluding chocolate drinks)
    if ((item.includes('oil') && !item.includes('chocolate')) || 
        item.includes('juice') || item.includes('water') || item.includes('sauce') || 
        item.includes('vinegar') || item.includes('syrup') || item.includes('honey')) {
      return 'liter';
    }
    
    // Powder/granular items
    if (item.includes('rice') || item.includes('flour') || item.includes('sugar') || 
        item.includes('salt') || item.includes('dal') || item.includes('lentil') || 
        item.includes('wheat') || item.includes('cereal') || item.includes('powder') ||
        item.includes('milk powder') || item.includes('coffee') || item.includes('tea')) {
      return 'kg';
    }
    
    // Fresh produce
    if (item.includes('tomato') || item.includes('onion') || item.includes('potato') || 
        item.includes('carrot') || item.includes('cabbage') || item.includes('cauliflower') ||
        item.includes('brinjal') || item.includes('capsicum') || item.includes('cucumber') ||
        item.includes('banana') || item.includes('apple') || item.includes('orange') ||
        item.includes('mango') || item.includes('grapes') || item.includes('lemon')) {
      return 'kg';
    }
    
    // Spices
    if (item.includes('turmeric') || item.includes('cumin') || item.includes('coriander') ||
        item.includes('garam') || item.includes('masala') || item.includes('chili') ||
        item.includes('pepper') || item.includes('cardamom') || item.includes('cinnamon')) {
      return 'gram';
    }
    
    // Default to piece for unknown items
    return 'piece';
  } catch (error) {
    console.error('Error detecting unit:', error);
    return 'piece';
  }
};

export const SimpleGrocerySearch: React.FC<SimpleGrocerySearchProps> = ({
  onItemAdd,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingUnit, setIsDetectingUnit] = useState(false);

  const handleAddItem = async () => {
    if (!searchQuery.trim()) return;
    
    setIsDetectingUnit(true);
    try {
      const unit = await detectUnit(searchQuery.trim());
      onItemAdd({
        name: searchQuery.trim(),
        unit: unit,
        quantity: 1
      });
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding item:', error);
      // Fallback to piece if unit detection fails
      onItemAdd({
        name: searchQuery.trim(),
        unit: 'piece',
        quantity: 1
      });
      setSearchQuery('');
    } finally {
      setIsDetectingUnit(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter what you want to buy (e.g., Tomato, Rice, Oil...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-20"
        />
        <Button
          onClick={handleAddItem}
          disabled={!searchQuery.trim() || isDetectingUnit}
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3"
        >
          {isDetectingUnit ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        💡 We'll automatically detect the best unit (kg, liter, packet, etc.) for your items
      </p>
    </div>
  );
};
