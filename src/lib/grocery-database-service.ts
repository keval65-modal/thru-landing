// Scalable Grocery Database Service with Firestore
import { db } from './firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';

export interface GroceryItem {
  id: string;
  name: string;
  normalizedName: string;
  brand?: string;
  category: string;
  subcategory?: string;
  description?: string;
  image?: string;
  tags: string[];
  availableQuantities: Array<{
    quantity: number;
    unit: string;
    packSize?: string;
    price?: number;
    isPopular?: boolean;
  }>;
  searchCount: number;
  lastSearched: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User ID who added this item
  verified: boolean; // Admin verified items
  confidence: number; // 0-1 confidence score based on usage
}

export interface GrocerySearchResult {
  item: GroceryItem;
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'category' | 'tag';
}

export class GroceryDatabaseService {
  private readonly COLLECTION_NAME = 'grocery_items';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private searchCache = new Map<string, { results: GrocerySearchResult[], timestamp: number }>();

  // Search grocery items with intelligent matching
  async searchItems(query: string, limitCount: number = 20): Promise<GrocerySearchResult[]> {
    if (!query.trim()) return [];

    const normalizedQuery = this.normalizeText(query);
    
    // Check cache first
    const cacheKey = `${normalizedQuery}_${limitCount}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results;
    }

    try {
      // Multi-strategy search
      const searchStrategies = [
        this.exactMatchSearch(normalizedQuery, limitCount),
        this.partialMatchSearch(normalizedQuery, limitCount),
        this.fuzzySearch(normalizedQuery, limitCount),
        this.categorySearch(normalizedQuery, limitCount),
        this.tagSearch(normalizedQuery, limitCount)
      ];

      const results = await Promise.all(searchStrategies);
      const allResults = results.flat();

      // Deduplicate and rank results
      const rankedResults = this.rankAndDeduplicateResults(allResults, normalizedQuery);
      
      // Update search counts for found items
      await this.updateSearchCounts(rankedResults.slice(0, limitCount));

      // Cache results
      this.searchCache.set(cacheKey, {
        results: rankedResults.slice(0, limitCount),
        timestamp: Date.now()
      });

      return rankedResults.slice(0, limitCount);
    } catch (error) {
      console.error('Grocery search error:', error);
      return [];
    }
  }

  // Add new grocery item (user-generated content)
  async addGroceryItem(itemData: Partial<GroceryItem>, userId?: string): Promise<string> {
    try {
      const normalizedName = this.normalizeText(itemData.name || '');
      
      // Check if similar item already exists
      const existingItems = await this.fuzzySearch(normalizedName, 5);
      if (existingItems.length > 0 && existingItems[0].relevanceScore > 0.8) {
        // Update existing item instead of creating duplicate
        const existingItem = existingItems[0].item;
        await this.updateItem(existingItem.id, {
          searchCount: existingItem.searchCount + 1,
          lastSearched: new Date(),
          updatedAt: new Date()
        });
        return existingItem.id;
      }

      const newItem: Omit<GroceryItem, 'id'> = {
        name: itemData.name || '',
        normalizedName,
        brand: itemData.brand,
        category: itemData.category || 'Grocery',
        subcategory: itemData.subcategory,
        description: itemData.description,
        image: itemData.image,
        tags: itemData.tags || [],
        availableQuantities: itemData.availableQuantities || [],
        searchCount: 1,
        lastSearched: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        verified: false,
        confidence: 0.5 // Start with medium confidence
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newItem);
      return docRef.id;
    } catch (error) {
      console.error('Error adding grocery item:', error);
      throw error;
    }
  }

  // Get popular items (most searched)
  async getPopularItems(limitCount: number = 10): Promise<GroceryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('searchCount', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroceryItem));
    } catch (error) {
      console.error('Error getting popular items:', error);
      return [];
    }
  }

  // Get items by category
  async getItemsByCategory(category: string, limitCount: number = 20): Promise<GroceryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('category', '==', category),
        orderBy('searchCount', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroceryItem));
    } catch (error) {
      console.error('Error getting items by category:', error);
      return [];
    }
  }

  // Update item (for admin verification, price updates, etc.)
  async updateItem(itemId: string, updates: Partial<GroceryItem>): Promise<void> {
    try {
      const itemRef = doc(db, this.COLLECTION_NAME, itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Private search methods
  private async exactMatchSearch(searchQuery: string, limitCount: number): Promise<GrocerySearchResult[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('normalizedName', '==', searchQuery),
        orderBy('searchCount', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        item: { id: doc.id, ...doc.data() } as GroceryItem,
        relevanceScore: 1.0,
        matchType: 'exact' as const
      }));
    } catch (error) {
      return [];
    }
  }

  private async partialMatchSearch(searchQuery: string, limitCount: number): Promise<GrocerySearchResult[]> {
    try {
      // Firestore doesn't support full-text search, so we'll use a workaround
      // This is a simplified version - in production, you'd use Algolia or similar
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('searchCount', 'desc'),
        limit(limitCount * 2) // Get more to filter
      );
      
      const snapshot = await getDocs(q);
      const results: GrocerySearchResult[] = [];
      
      snapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as GroceryItem;
        if (item.normalizedName.includes(searchQuery) || item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          const relevanceScore = this.calculateRelevanceScore(item.normalizedName, searchQuery);
          if (relevanceScore > 0.3) {
            results.push({
              item,
              relevanceScore,
              matchType: 'partial' as const
            });
          }
        }
      });
      
      return results.slice(0, limitCount);
    } catch (error) {
      return [];
    }
  }

  private async fuzzySearch(searchQuery: string, limitCount: number): Promise<GrocerySearchResult[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('searchCount', 'desc'),
        limit(limitCount * 3) // Get more to filter
      );
      
      const snapshot = await getDocs(q);
      const results: GrocerySearchResult[] = [];
      
      snapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as GroceryItem;
        const relevanceScore = this.calculateFuzzyScore(item.normalizedName, searchQuery);
        if (relevanceScore > 0.4) {
          results.push({
            item,
            relevanceScore,
            matchType: 'fuzzy' as const
          });
        }
      });
      
      return results.slice(0, limitCount);
    } catch (error) {
      return [];
    }
  }

  private async categorySearch(searchQuery: string, limitCount: number): Promise<GrocerySearchResult[]> {
    try {
      const category = this.inferCategory(searchQuery);
      if (!category) return [];

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('category', '==', category),
        orderBy('searchCount', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        item: { id: doc.id, ...doc.data() } as GroceryItem,
        relevanceScore: 0.6,
        matchType: 'category' as const
      }));
    } catch (error) {
      return [];
    }
  }

  private async tagSearch(searchQuery: string, limitCount: number): Promise<GrocerySearchResult[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('searchCount', 'desc'),
        limit(limitCount * 2)
      );
      
      const snapshot = await getDocs(q);
      const results: GrocerySearchResult[] = [];
      
      snapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as GroceryItem;
        const hasMatchingTag = item.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase()) || 
          searchQuery.toLowerCase().includes(tag.toLowerCase())
        );
        
        if (hasMatchingTag) {
          results.push({
            item,
            relevanceScore: 0.5,
            matchType: 'tag' as const
          });
        }
      });
      
      return results.slice(0, limitCount);
    } catch (error) {
      return [];
    }
  }

  // Utility methods
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private calculateRelevanceScore(itemName: string, query: string): number {
    const itemLower = itemName.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (itemLower === queryLower) return 1.0;
    if (itemLower.startsWith(queryLower)) return 0.9;
    if (itemLower.includes(queryLower)) return 0.7;
    if (queryLower.includes(itemLower)) return 0.6;
    
    return 0.3;
  }

  private calculateFuzzyScore(itemName: string, query: string): number {
    // Simple Levenshtein distance-based scoring
    const distance = this.levenshteinDistance(itemName, query);
    const maxLength = Math.max(itemName.length, query.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private inferCategory(query: string): string | null {
    const queryLower = query.toLowerCase();
    
    const categoryMap: Record<string, string> = {
      'rice': 'Grains',
      'dal': 'Pulses',
      'oil': 'Cooking Oil',
      'maggi': 'Instant Food',
      'noodles': 'Instant Food',
      'milk': 'Dairy',
      'bread': 'Bakery',
      'eggs': 'Dairy',
      'salt': 'Spices',
      'onion': 'Vegetables',
      'tomato': 'Vegetables',
      'potato': 'Vegetables',
      'spice': 'Spices',
      'masala': 'Spices'
    };
    
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (queryLower.includes(keyword)) {
        return category;
      }
    }
    
    return null;
  }

  private rankAndDeduplicateResults(results: GrocerySearchResult[], query: string): GrocerySearchResult[] {
    // Remove duplicates based on item ID
    const uniqueResults = new Map<string, GrocerySearchResult>();
    
    results.forEach(result => {
      const existing = uniqueResults.get(result.item.id);
      if (!existing || result.relevanceScore > existing.relevanceScore) {
        uniqueResults.set(result.item.id, result);
      }
    });
    
    // Sort by relevance score and search count
    return Array.from(uniqueResults.values()).sort((a, b) => {
      const scoreA = a.relevanceScore * 0.7 + (a.item.searchCount / 1000) * 0.3;
      const scoreB = b.relevanceScore * 0.7 + (b.item.searchCount / 1000) * 0.3;
      return scoreB - scoreA;
    });
  }

  private async updateSearchCounts(results: GrocerySearchResult[]): Promise<void> {
    const updatePromises = results.map(result => 
      this.updateItem(result.item.id, {
        searchCount: result.item.searchCount + 1,
        lastSearched: new Date()
      })
    );
    
    await Promise.allSettled(updatePromises);
  }

  // Initialize with seed data
  async initializeWithSeedData(): Promise<void> {
    try {
      // Check if data already exists
      const existingItems = await this.getPopularItems(1);
      if (existingItems.length > 0) {
        console.log('Grocery database already initialized');
        return;
      }

      console.log('Initializing grocery database with seed data...');
      
      const seedData: Partial<GroceryItem>[] = [
        {
          name: 'Basmati Rice',
          brand: 'India Gate',
          category: 'Grains',
          tags: ['rice', 'basmati', 'long grain'],
          availableQuantities: [
            { quantity: 1, unit: 'kg', packSize: '1kg', price: 80, isPopular: true },
            { quantity: 5, unit: 'kg', packSize: '5kg', price: 350, isPopular: true }
          ],
          verified: true,
          confidence: 0.9
        },
        {
          name: 'Sunflower Oil',
          brand: 'Fortune',
          category: 'Cooking Oil',
          tags: ['oil', 'sunflower', 'cooking'],
          availableQuantities: [
            { quantity: 1, unit: 'liter', packSize: '1L', price: 150, isPopular: true },
            { quantity: 5, unit: 'liter', packSize: '5L', price: 700, isPopular: true }
          ],
          verified: true,
          confidence: 0.9
        },
        {
          name: 'Maggi 2-Minute Noodles',
          brand: 'Nestle',
          category: 'Instant Food',
          tags: ['maggi', 'noodles', 'instant', '2-minute'],
          availableQuantities: [
            { quantity: 1, unit: 'pack', packSize: '70g', price: 12, isPopular: true },
            { quantity: 12, unit: 'pack', packSize: '70g each', price: 120, isPopular: true }
          ],
          verified: true,
          confidence: 0.9
        }
      ];

      for (const item of seedData) {
        await this.addGroceryItem(item);
      }

      console.log('Grocery database initialized successfully');
    } catch (error) {
      console.error('Error initializing grocery database:', error);
    }
  }
}

// Export singleton instance
export const groceryDatabaseService = new GroceryDatabaseService();
