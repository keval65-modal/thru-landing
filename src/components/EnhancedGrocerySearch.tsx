import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Loader2, Package, Scale, Droplets, ShoppingCart, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { groceryLearningSystem } from '@/lib/grocery-learning-system';

interface UnitOption {
  unit: string;
  displayName: string;
  icon: React.ReactNode;
  description: string;
}

interface GroceryItem {
  name: string;
  unitOptions: UnitOption[];
  defaultQuantity: number;
  defaultUnit: string;
}

interface EnhancedGrocerySearchProps {
  onItemAdd: (item: { name: string; unit: string; quantity: number }) => void;
  className?: string;
}

// AI-powered unit detection with multiple options
const detectItemUnits = async (itemName: string): Promise<GroceryItem> => {
  try {
    const item = itemName.toLowerCase().trim();
    
    // Define unit options with icons and descriptions
    const unitDefinitions = {
      piece: { displayName: 'Piece', icon: <Package className="h-4 w-4" />, description: 'Individual items' },
      kg: { displayName: 'Kilogram', icon: <Scale className="h-4 w-4" />, description: 'Weight-based' },
      gram: { displayName: 'Gram', icon: <Scale className="h-4 w-4" />, description: 'Small weight' },
      liter: { displayName: 'Liter', icon: <Droplets className="h-4 w-4" />, description: 'Volume-based' },
      packet: { displayName: 'Packet', icon: <ShoppingCart className="h-4 w-4" />, description: 'Packaged items' },
      dozen: { displayName: 'Dozen', icon: <Package className="h-4 w-4" />, description: '12 pieces' },
      box: { displayName: 'Box', icon: <Package className="h-4 w-4" />, description: 'Boxed items' }
    };

    // AI logic to determine appropriate units for different items
    let unitOptions: UnitOption[] = [];
    let defaultQuantity = 1;
    let defaultUnit = 'piece';

    // Cheese and dairy products
    if (item.includes('cheese') || item.includes('paneer')) {
      if (item.includes('slice')) {
        unitOptions = [
          { unit: 'piece', ...unitDefinitions.piece },
          { unit: 'dozen', ...unitDefinitions.dozen },
          { unit: 'packet', ...unitDefinitions.packet }
        ];
        defaultQuantity = 12;
        defaultUnit = 'piece';
      } else {
        unitOptions = [
          { unit: 'kg', ...unitDefinitions.kg },
          { unit: 'gram', ...unitDefinitions.gram },
          { unit: 'packet', ...unitDefinitions.packet }
        ];
        defaultQuantity = 250;
        defaultUnit = 'gram';
      }
    }
    // Fresh produce
    else if (item.includes('tomato') || item.includes('onion') || item.includes('potato') || 
             item.includes('carrot') || item.includes('cabbage') || item.includes('cauliflower') ||
             item.includes('brinjal') || item.includes('capsicum') || item.includes('cucumber') ||
             item.includes('banana') || item.includes('apple') || item.includes('orange') ||
             item.includes('mango') || item.includes('grapes') || item.includes('lemon')) {
      unitOptions = [
        { unit: 'kg', ...unitDefinitions.kg },
        { unit: 'gram', ...unitDefinitions.gram },
        { unit: 'piece', ...unitDefinitions.piece }
      ];
      defaultQuantity = 1;
      defaultUnit = 'kg';
    }
    // Grains and cereals
    else if (item.includes('rice') || item.includes('wheat') || item.includes('dal') || 
             item.includes('lentil') || item.includes('flour') || item.includes('sugar') || 
             item.includes('salt') || item.includes('cereal')) {
      unitOptions = [
        { unit: 'kg', ...unitDefinitions.kg },
        { unit: 'gram', ...unitDefinitions.gram },
        { unit: 'packet', ...unitDefinitions.packet }
      ];
      defaultQuantity = 1;
      defaultUnit = 'kg';
    }
    // Liquids
    else if (item.includes('oil') || item.includes('juice') || item.includes('water') || 
             item.includes('sauce') || item.includes('vinegar') || item.includes('syrup') || 
             item.includes('honey')) {
      unitOptions = [
        { unit: 'liter', ...unitDefinitions.liter },
        { unit: 'packet', ...unitDefinitions.packet },
        { unit: 'piece', ...unitDefinitions.piece }
      ];
      defaultQuantity = 1;
      defaultUnit = 'liter';
    }
    // Dairy products
    else if (item.includes('milk') || item.includes('yogurt') || item.includes('curd') || 
             item.includes('butter')) {
      if (item.includes('powder')) {
        unitOptions = [
          { unit: 'kg', ...unitDefinitions.kg },
          { unit: 'gram', ...unitDefinitions.gram },
          { unit: 'packet', ...unitDefinitions.packet }
        ];
        defaultQuantity = 1;
        defaultUnit = 'kg';
      } else {
        unitOptions = [
          { unit: 'liter', ...unitDefinitions.liter },
          { unit: 'packet', ...unitDefinitions.packet },
          { unit: 'piece', ...unitDefinitions.piece }
        ];
        defaultQuantity = 1;
        defaultUnit = 'liter';
      }
    }
    // Packaged foods
    else if (item.includes('chocolate') || item.includes('biscuit') || item.includes('cookies') ||
             item.includes('chips') || item.includes('crackers') || item.includes('snacks') ||
             item.includes('candy') || item.includes('sweets') || item.includes('toffee') ||
             item.includes('maggi') || item.includes('noodles') || item.includes('pasta') ||
             item.includes('bread') || item.includes('cake') || item.includes('muffin')) {
      unitOptions = [
        { unit: 'packet', ...unitDefinitions.packet },
        { unit: 'piece', ...unitDefinitions.piece },
        { unit: 'box', ...unitDefinitions.box }
      ];
      defaultQuantity = 1;
      defaultUnit = 'packet';
    }
    // Spices
    else if (item.includes('turmeric') || item.includes('cumin') || item.includes('coriander') ||
             item.includes('garam') || item.includes('masala') || item.includes('chili') ||
             item.includes('pepper') || item.includes('cardamom') || item.includes('cinnamon')) {
      unitOptions = [
        { unit: 'gram', ...unitDefinitions.gram },
        { unit: 'kg', ...unitDefinitions.kg },
        { unit: 'packet', ...unitDefinitions.packet }
      ];
      defaultQuantity = 100;
      defaultUnit = 'gram';
    }
    // Default fallback
    else {
      unitOptions = [
        { unit: 'piece', ...unitDefinitions.piece },
        { unit: 'kg', ...unitDefinitions.kg },
        { unit: 'packet', ...unitDefinitions.packet }
      ];
      defaultQuantity = 1;
      defaultUnit = 'piece';
    }

    return {
      name: itemName.trim(),
      unitOptions,
      defaultQuantity,
      defaultUnit
    };
  } catch (error) {
    console.error('Error detecting item units:', error);
    // Fallback
    return {
      name: itemName.trim(),
      unitOptions: [
        { unit: 'piece', displayName: 'Piece', icon: <Package className="h-4 w-4" />, description: 'Individual items' }
      ],
      defaultQuantity: 1,
      defaultUnit: 'piece'
    };
  }
};

export const EnhancedGrocerySearch: React.FC<EnhancedGrocerySearchProps> = ({
  onItemAdd,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingUnits, setIsDetectingUnits] = useState(false);
  const [detectedItem, setDetectedItem] = useState<GroceryItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [learnedSuggestion, setLearnedSuggestion] = useState<string | null>(null);
  const [showLearningIndicator, setShowLearningIndicator] = useState(false);

  // Check for learned suggestions when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const suggestion = groceryLearningSystem.getLearnedSuggestion(searchQuery.trim());
      setLearnedSuggestion(suggestion);
      
      // Show learning indicator if we have user preferences
      const preferences = groceryLearningSystem.getUserPreferences(searchQuery.trim());
      setShowLearningIndicator(preferences.length > 0);
    } else {
      setLearnedSuggestion(null);
      setShowLearningIndicator(false);
    }
  }, [searchQuery]);

  const handleAddItem = async () => {
    if (!searchQuery.trim()) return;
    
    setIsDetectingUnits(true);
    try {
      const item = await detectItemUnits(searchQuery.trim());
      
      // Use learned suggestion if available, otherwise use detected or selected unit
      const finalUnit = learnedSuggestion || selectedUnit || item.defaultUnit;
      const finalQuantity = selectedQuantity || item.defaultQuantity;
      
      // Track user input for learning
      groceryLearningSystem.trackUserInput(searchQuery.trim(), finalUnit, finalQuantity);
      
      onItemAdd({
        name: item.name,
        unit: finalUnit,
        quantity: finalQuantity
      });
      
      // Reset form
      setSearchQuery('');
      setDetectedItem(null);
      setSelectedQuantity(1);
      setSelectedUnit('');
      setLearnedSuggestion(null);
      setShowLearningIndicator(false);
    } catch (error) {
      console.error('Error adding item:', error);
      // Fallback to simple add
      const fallbackUnit = learnedSuggestion || selectedUnit || 'piece';
      groceryLearningSystem.trackUserInput(searchQuery.trim(), fallbackUnit, selectedQuantity || 1);
      
      onItemAdd({
        name: searchQuery.trim(),
        unit: fallbackUnit,
        quantity: selectedQuantity || 1
      });
      setSearchQuery('');
      setSelectedQuantity(1);
      setSelectedUnit('');
      setLearnedSuggestion(null);
      setShowLearningIndicator(false);
    } finally {
      setIsDetectingUnits(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Two-Row Compact Interface */}
      <div className="space-y-2">
        {/* First Row: Item Name + Add Button */}
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Enter item (e.g., Cheese Slice, Tomato...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
              {showLearningIndicator && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2" title="AI Learning Active">
                  <Brain className="h-4 w-4 text-blue-500" />
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleAddItem}
            disabled={!searchQuery.trim() || isDetectingUnits}
            className="px-6"
          >
            {isDetectingUnits ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </div>
        
        {/* Second Row: Quantity + Unit */}
        <div className="flex gap-2 items-center">
          <div className="w-20">
            <Input
              type="number"
              min="1"
              placeholder="Qty"
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
              className="text-center"
            />
          </div>
          
          <div className="w-24">
            <Select 
              value={learnedSuggestion || selectedUnit} 
              onValueChange={setSelectedUnit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {learnedSuggestion && (
                  <SelectItem value={learnedSuggestion} className="bg-blue-50">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-3 w-3 text-blue-500" />
                      <span>{learnedSuggestion}</span>
                      <span className="text-xs text-blue-600">(Learned)</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="gram">gram</SelectItem>
                <SelectItem value="liter">liter</SelectItem>
                <SelectItem value="packet">Packet</SelectItem>
                <SelectItem value="dozen">Dozen</SelectItem>
                <SelectItem value="box">Box</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Spacer to align with first row */}
          <div className="flex-1"></div>
        </div>
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        🧠 AI learns from your choices and suggests your preferred units automatically
      </p>
    </div>
  );
};
