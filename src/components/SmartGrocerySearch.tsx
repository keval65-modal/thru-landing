import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Package, Star, TrendingUp, Users, Clock, ExternalLink, Plus } from 'lucide-react';
import { useGroceryAISearch, GrocerySearchResult } from '@/hooks/useGroceryAISearch';
import { DynamicProduct } from '@/lib/scalable-grocery-ai-service';
import { cn } from '@/lib/utils';
import { AddGroceryItem } from './AddGroceryItem';

interface SmartGrocerySearchProps {
  onProductSelect: (product: DynamicProduct, quantity: {quantity: number, unit: string, packSize?: string}) => void;
  className?: string;
}

const QuantityReasonIcon = ({ reason }: { reason?: string }) => {
  switch (reason) {
    case "Most Popular":
      return <Star className="h-3 w-3 text-yellow-500" />;
    case "Try First":
      return <Package className="h-3 w-3 text-blue-500" />;
    case "Bulk Buy":
    case "Bulk Savings":
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    case "Weekly Use":
    case "Monthly Stock":
      return <Clock className="h-3 w-3 text-purple-500" />;
    case "Fresh Daily":
    case "Family Size":
      return <Users className="h-3 w-3 text-pink-500" />;
    case "Daily Use":
      return <Clock className="h-3 w-3 text-orange-500" />;
    case "Best Value":
      return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    default:
      return null;
  }
};

const SourceBadge = ({ source }: { source: string }) => {
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'bigbasket': return 'bg-orange-100 text-orange-800';
      case 'grofers': return 'bg-green-100 text-green-800';
      case 'amazon': return 'bg-blue-100 text-blue-800';
      case 'flipkart': return 'bg-yellow-100 text-yellow-800';
      case 'google_shopping': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'bigbasket': return 'BigBasket';
      case 'grofers': return 'Grofers';
      case 'amazon': return 'Amazon';
      case 'flipkart': return 'Flipkart';
      case 'google_shopping': return 'Google Shopping';
      default: return source;
    }
  };

  return (
    <Badge variant="secondary" className={cn("text-xs", getSourceColor(source))}>
      {getSourceName(source)}
    </Badge>
  );
};

const SearchResultItem: React.FC<{
  result: GrocerySearchResult;
  onSelect: (product: DynamicProduct, quantity: {quantity: number, unit: string, packSize?: string}) => void;
}> = ({ result, onSelect }) => {
  const { product, suggestedQuantities } = result;

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{product.name}</h4>
            <SourceBadge source={product.source} />
            {product.brand && (
              <Badge variant="outline" className="text-xs">
                {product.brand}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{product.category}</p>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
          )}
        </div>
        {product.image && (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-12 h-12 object-cover rounded"
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Available Quantities:</p>
        <div className="grid grid-cols-2 gap-1">
          {suggestedQuantities.slice(0, 4).map((quantity, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-8 text-xs justify-start"
              onClick={() => onSelect(product, quantity)}
            >
              <div className="flex items-center gap-1">
                <QuantityReasonIcon reason={quantity.reason} />
                <span className="font-medium">
                  {quantity.quantity} {quantity.unit}
                </span>
                {quantity.packSize && (
                  <span className="text-muted-foreground">
                    ({quantity.packSize})
                  </span>
                )}
                {quantity.source && (
                  <ExternalLink className="h-2 w-2 text-muted-foreground" />
                )}
              </div>
            </Button>
          ))}
        </div>
        
        {suggestedQuantities.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={() => onSelect(product, suggestedQuantities[0])}
          >
            +{suggestedQuantities.length - 4} more options
          </Button>
        )}
      </div>
    </Card>
  );
};

export const SmartGrocerySearch: React.FC<SmartGrocerySearchProps> = ({
  onProductSelect,
  className
}) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    error,
    clearSearch,
    selectProduct,
  } = useGroceryAISearch(onProductSelect);

  // Handle adding custom item directly to list
  const handleAddCustomItem = async (itemName: string) => {
    try {
      // Create a custom product for immediate use
      const customProduct: DynamicProduct = {
        id: `custom_${Date.now()}`,
        name: itemName,
        category: 'Custom',
        availableQuantities: [{
          quantity: 1,
          unit: 'piece',
          isPopular: true
        }],
        source: 'database',
        confidence: 0.5
      };

      // Add to user's list immediately
      onProductSelect(customProduct, {
        quantity: 1,
        unit: 'piece'
      });

      // Add to database for future searches
      await fetch('/api/grocery-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          item: {
            name: itemName,
            category: 'Custom',
            availableQuantities: [{
              quantity: 1,
              unit: 'piece',
              isPopular: true
            }],
            tags: [itemName.toLowerCase()]
          }
        }),
      });

      // Clear search
      clearSearch();
    } catch (error) {
      console.error('Error adding custom item:', error);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for groceries (e.g., Maggi, Rice, Oil, Onions...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {searchQuery && !isSearching && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            ×
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} from multiple sources
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={clearSearch}
            >
              Clear
            </Button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <SearchResultItem
                key={result.product.id}
                result={result}
                onSelect={selectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No products found for "{searchQuery}"</p>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Add this item to your list anyway?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAddCustomItem(searchQuery)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add "{searchQuery}" to List
              </Button>
              <AddGroceryItem 
                onItemAdded={clearSearch}
                prefilledName={searchQuery}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Adding items helps build our database for future searches
            </p>
          </div>
        </div>
      )}

      {/* Show custom product if available */}
      {searchQuery && searchResults.length === 1 && searchResults[0].product.category === 'Custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Custom Item - Not in Database
            </h3>
          </div>
          
          <Card className="p-3 border-dashed border-2 border-muted-foreground/20">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{searchResults[0].product.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    Custom
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">This item is not in our database yet</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add to your list:</p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs justify-start"
                  onClick={() => selectProduct(searchResults[0].product, {
                    quantity: 1,
                    unit: 'piece'
                  })}
                >
                  <div className="flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    <span className="font-medium">1 piece</span>
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
