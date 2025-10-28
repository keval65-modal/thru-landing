import { useState, useCallback, useRef, useEffect } from 'react';
import { scalableGroceryAIService, DynamicProduct } from '@/lib/scalable-grocery-ai-service';

export interface GrocerySearchResult {
  product: DynamicProduct;
  suggestedQuantities: Array<{
    quantity: number;
    unit: string;
    packSize?: string;
    reason?: string;
    confidence?: number;
    source?: string;
  }>;
}

export interface UseGroceryAISearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: GrocerySearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  clearSearch: () => void;
  selectProduct: (product: DynamicProduct, selectedQuantity: {quantity: number, unit: string, packSize?: string}) => void;
}

export function useGroceryAISearch(
  onProductSelect?: (product: DynamicProduct, quantity: {quantity: number, unit: string, packSize?: string}) => void
): UseGroceryAISearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GrocerySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsSearching(true);
    setError(null);

    try {
      const results = await scalableGroceryAIService.searchProducts(query);
      
      // Transform results to include smart quantity suggestions
      const searchResultsWithSuggestions: GrocerySearchResult[] = await Promise.all(
        results.map(async (product) => ({
          product,
          suggestedQuantities: await scalableGroceryAIService.getSmartQuantitySuggestions(product)
        }))
      );

      setSearchResults(searchResultsWithSuggestions);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Search failed. Please try again.');
        console.error('Grocery search error:', err);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search query changes with debouncing
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 500); // Increased debounce for API calls
  }, [performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setIsSearching(false);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Select product with quantity
  const selectProduct = useCallback((product: DynamicProduct, selectedQuantity: {quantity: number, unit: string, packSize?: string}) => {
    if (onProductSelect) {
      onProductSelect(product, selectedQuantity);
    }
    clearSearch();
  }, [onProductSelect, clearSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearchQueryChange,
    searchResults,
    isLoading,
    isSearching,
    error,
    clearSearch,
    selectProduct,
  };
}
