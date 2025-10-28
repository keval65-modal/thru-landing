import { useState, useCallback } from 'react';
import { FirebaseGroceryService, GrocerySearchResult, VendorInventoryItem } from '@/lib/firebase-grocery-service';

export interface UseFirebaseGrocerySearchReturn {
  searchResults: GrocerySearchResult | null;
  isLoading: boolean;
  error: string | null;
  searchGroceryItems: (
    query: string,
    location?: { latitude: number; longitude: number },
    maxDetourKm?: number
  ) => Promise<void>;
  clearResults: () => void;
}

export function useFirebaseGrocerySearch(): UseFirebaseGrocerySearchReturn {
  const [searchResults, setSearchResults] = useState<GrocerySearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGroceryItems = useCallback(async (
    searchQuery: string,
    location?: { latitude: number; longitude: number },
    maxDetourKm: number = 5
  ) => {
    if (!searchQuery.trim()) {
      setError('Search query cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await FirebaseGroceryService.searchGroceryItems(
        searchQuery,
        location,
        maxDetourKm
      );
      
      setSearchResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search grocery items';
      setError(errorMessage);
      console.error('Grocery search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchGroceryItems,
    clearResults
  };
}


