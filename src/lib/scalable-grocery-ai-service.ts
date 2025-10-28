// Scalable AI-powered grocery search using real-time web scraping
import { groceryDatabaseService, GroceryItem } from './grocery-database-service';

export interface DynamicProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
  availableQuantities: Array<{
    quantity: number;
    unit: string;
    packSize?: string;
    price?: number;
    source?: string;
    isPopular?: boolean;
  }>;
  image?: string;
  description?: string;
  source: 'bigbasket' | 'grofers' | 'amazon' | 'flipkart' | 'google_shopping' | 'database';
  confidence: number; // 0-1 confidence score
}

export interface SearchResult {
  products: DynamicProduct[];
  totalResults: number;
  searchTime: number;
  sources: string[];
}

// AI-powered product search service with database integration
export class ScalableGroceryAIService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
  
  // Search products using database-first approach
  async searchProducts(query: string): Promise<DynamicProduct[]> {
    if (!query.trim()) return [];

    const startTime = Date.now();
    
    try {
      // Initialize database if needed
      await groceryDatabaseService.initializeWithSeedData();
      
      // First, search the database for existing items
      const dbResults = await groceryDatabaseService.searchItems(query, 15);
      
      if (dbResults.length > 0) {
        console.log(`Found ${dbResults.length} items in database for query: ${query}`);
        
        // Convert database results to DynamicProduct format
        const products: DynamicProduct[] = dbResults.map(result => ({
          id: result.item.id,
          name: result.item.name,
          brand: result.item.brand,
          category: result.item.category,
          availableQuantities: result.item.availableQuantities.map(aq => ({
            quantity: aq.quantity,
            unit: aq.unit,
            packSize: aq.packSize,
            price: aq.price,
            isPopular: aq.isPopular,
            source: 'database'
          })),
          image: result.item.image,
          description: result.item.description,
          source: 'database' as const,
          confidence: result.item.confidence
        }));
        
        return products;
      }
      
      // If no database results, try web scraping as fallback
      console.log(`No database results for query: ${query}, trying web scraping...`);
      const scrapedResults = await this.scrapeExternalSources(query);
      
      if (scrapedResults.length > 0) {
        // Add scraped results to database for future searches
        await this.addScrapedResultsToDatabase(scrapedResults, query);
        return scrapedResults;
      }
      
      // If no results from any source, add the query as a new item request
      await this.addNewItemRequest(query);
      
      // Return a custom product that can be added to the user's list
      const customProduct: DynamicProduct = {
        id: `custom_${Date.now()}`,
        name: query,
        category: 'Custom',
        availableQuantities: [{
          quantity: 1,
          unit: 'piece',
          isPopular: true
        }],
        source: 'database' as const,
        confidence: 0.3 // Low confidence for custom items
      };
      
      return [customProduct];
    } catch (error) {
      console.error('Error in scalable grocery search:', error);
      return [];
    }
  }

  // Scrape external sources as fallback
  private async scrapeExternalSources(query: string): Promise<DynamicProduct[]> {
    try {
      const searchPromises = [
        this.searchBigBasket(query),
        this.searchGrofers(query),
        this.searchAmazon(query),
        this.searchGoogleShopping(query)
      ];

      const timeoutPromise = new Promise<DynamicProduct[]>((_, reject) => {
        setTimeout(() => reject(new Error('Search timeout')), 5000);
      });

      const results = await Promise.allSettled([
        ...searchPromises,
        timeoutPromise
      ]);
      
      const allProducts: DynamicProduct[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          allProducts.push(...result.value);
        }
      });

      return allProducts.slice(0, 10); // Limit scraped results
    } catch (error) {
      console.error('Error scraping external sources:', error);
      return [];
    }
  }

  // Add scraped results to database
  private async addScrapedResultsToDatabase(products: DynamicProduct[], originalQuery: string): Promise<void> {
    try {
      for (const product of products) {
        await groceryDatabaseService.addGroceryItem({
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description,
          image: product.image,
          availableQuantities: product.availableQuantities,
          tags: [originalQuery.toLowerCase()],
          verified: false,
          confidence: 0.7 // Medium confidence for scraped data
        });
      }
      console.log(`Added ${products.length} scraped products to database`);
    } catch (error) {
      console.error('Error adding scraped results to database:', error);
    }
  }

  // Add new item request for items not found
  private async addNewItemRequest(query: string): Promise<void> {
    try {
      await groceryDatabaseService.addGroceryItem({
        name: query,
        category: 'Unknown',
        tags: [query.toLowerCase()],
        availableQuantities: [],
        verified: false,
        confidence: 0.1 // Low confidence for unknown items
      });
      console.log(`Added new item request for: ${query}`);
    } catch (error) {
      console.error('Error adding new item request:', error);
    }
  }

  // Search BigBasket (Indian grocery platform)
  private async searchBigBasket(query: string): Promise<DynamicProduct[]> {
    try {
      // Try enhanced scraping first
      const enhancedResponse = await fetch(`${this.API_BASE_URL}/scrape/enhanced?q=${encodeURIComponent(query)}&source=bigbasket`);
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json();
        return this.parseBigBasketResults(data);
      }
      
      // Fallback to basic scraping
      const response = await fetch(`${this.API_BASE_URL}/scrape/bigbasket?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('BigBasket search failed');
      
      const data = await response.json();
      return this.parseBigBasketResults(data);
    } catch (error) {
      console.error('BigBasket search error:', error);
      return [];
    }
  }

  // Search Grofers (Indian grocery platform)
  private async searchGrofers(query: string): Promise<DynamicProduct[]> {
    try {
      // Try enhanced scraping first
      const enhancedResponse = await fetch(`${this.API_BASE_URL}/scrape/enhanced?q=${encodeURIComponent(query)}&source=grofers`);
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json();
        return this.parseGrofersResults(data);
      }
      
      // Fallback to basic scraping
      const response = await fetch(`${this.API_BASE_URL}/scrape/grofers?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Grofers search failed');
      
      const data = await response.json();
      return this.parseGrofersResults(data);
    } catch (error) {
      console.error('Grofers search error:', error);
      return [];
    }
  }

  // Search Amazon India
  private async searchAmazon(query: string): Promise<DynamicProduct[]> {
    try {
      // Try enhanced scraping first
      const enhancedResponse = await fetch(`${this.API_BASE_URL}/scrape/enhanced?q=${encodeURIComponent(query)}&source=amazon`);
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json();
        return this.parseAmazonResults(data);
      }
      
      // Fallback to basic scraping
      const response = await fetch(`${this.API_BASE_URL}/scrape/amazon?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Amazon search failed');
      
      const data = await response.json();
      return this.parseAmazonResults(data);
    } catch (error) {
      console.error('Amazon search error:', error);
      return [];
    }
  }

  // Search Google Shopping
  private async searchGoogleShopping(query: string): Promise<DynamicProduct[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/scrape/google-shopping?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Google Shopping search failed');
      
      const data = await response.json();
      return this.parseGoogleShoppingResults(data);
    } catch (error) {
      console.error('Google Shopping search error:', error);
      return [];
    }
  }

  // Parse BigBasket results
  private parseBigBasketResults(data: any): DynamicProduct[] {
    if (!data.products) return [];
    
    return data.products.map((product: any) => ({
      id: `bb_${product.id}`,
      name: product.name,
      brand: product.brand,
      category: product.category || 'Grocery',
      availableQuantities: this.extractQuantitiesFromBigBasket(product),
      image: product.image,
      description: product.description,
      source: 'bigbasket' as const,
      confidence: 0.9
    }));
  }

  // Parse Grofers results
  private parseGrofersResults(data: any): DynamicProduct[] {
    if (!data.products) return [];
    
    return data.products.map((product: any) => ({
      id: `gf_${product.id}`,
      name: product.name,
      brand: product.brand,
      category: product.category || 'Grocery',
      availableQuantities: this.extractQuantitiesFromGrofers(product),
      image: product.image,
      description: product.description,
      source: 'grofers' as const,
      confidence: 0.85
    }));
  }

  // Parse Amazon results
  private parseAmazonResults(data: any): DynamicProduct[] {
    if (!data.products) return [];
    
    return data.products.map((product: any) => ({
      id: `amz_${product.id}`,
      name: product.name,
      brand: product.brand,
      category: product.category || 'Grocery',
      availableQuantities: this.extractQuantitiesFromAmazon(product),
      image: product.image,
      description: product.description,
      source: 'amazon' as const,
      confidence: 0.8
    }));
  }

  // Parse Google Shopping results
  private parseGoogleShoppingResults(data: any): DynamicProduct[] {
    if (!data.products) return [];
    
    return data.products.map((product: any) => ({
      id: `gs_${product.id}`,
      name: product.name,
      brand: product.brand,
      category: product.category || 'Grocery',
      availableQuantities: this.extractQuantitiesFromGoogleShopping(product),
      image: product.image,
      description: product.description,
      source: 'google_shopping' as const,
      confidence: 0.7
    }));
  }

  // Extract quantities from BigBasket product data
  private extractQuantitiesFromBigBasket(product: any): Array<{quantity: number, unit: string, packSize?: string, price?: number, source?: string}> {
    const quantities = [];
    
    // BigBasket typically has multiple pack sizes
    if (product.packSizes) {
      product.packSizes.forEach((pack: any) => {
        quantities.push({
          quantity: pack.quantity,
          unit: pack.unit,
          packSize: pack.description,
          price: pack.price,
          source: 'BigBasket',
          isPopular: pack.isPopular
        });
      });
    } else {
      // Fallback to single quantity
      quantities.push({
        quantity: 1,
        unit: product.unit || 'piece',
        packSize: product.packSize,
        price: product.price,
        source: 'BigBasket'
      });
    }
    
    return quantities;
  }

  // Extract quantities from Grofers product data
  private extractQuantitiesFromGrofers(product: any): Array<{quantity: number, unit: string, packSize?: string, price?: number, source?: string}> {
    const quantities = [];
    
    if (product.variants) {
      product.variants.forEach((variant: any) => {
        quantities.push({
          quantity: variant.quantity,
          unit: variant.unit,
          packSize: variant.packSize,
          price: variant.price,
          source: 'Grofers',
          isPopular: variant.isPopular
        });
      });
    } else {
      quantities.push({
        quantity: 1,
        unit: product.unit || 'piece',
        packSize: product.packSize,
        price: product.price,
        source: 'Grofers'
      });
    }
    
    return quantities;
  }

  // Extract quantities from Amazon product data
  private extractQuantitiesFromAmazon(product: any): Array<{quantity: number, unit: string, packSize?: string, price?: number, source?: string}> {
    const quantities = [];
    
    // Amazon often has different pack sizes
    if (product.variations) {
      product.variations.forEach((variation: any) => {
        quantities.push({
          quantity: variation.quantity,
          unit: variation.unit,
          packSize: variation.packSize,
          price: variation.price,
          source: 'Amazon',
          isPopular: variation.isPopular
        });
      });
    } else {
      quantities.push({
        quantity: 1,
        unit: product.unit || 'piece',
        packSize: product.packSize,
        price: product.price,
        source: 'Amazon'
      });
    }
    
    return quantities;
  }

  // Extract quantities from Google Shopping product data
  private extractQuantitiesFromGoogleShopping(product: any): Array<{quantity: number, unit: string, packSize?: string, price?: number, source?: string}> {
    const quantities = [];
    
    // Google Shopping aggregates from multiple sources
    if (product.offers) {
      product.offers.forEach((offer: any) => {
        quantities.push({
          quantity: offer.quantity || 1,
          unit: offer.unit || 'piece',
          packSize: offer.packSize,
          price: offer.price,
          source: offer.merchant || 'Google Shopping'
        });
      });
    } else {
      quantities.push({
        quantity: 1,
        unit: product.unit || 'piece',
        packSize: product.packSize,
        price: product.price,
        source: 'Google Shopping'
      });
    }
    
    return quantities;
  }

  // AI-powered product normalization and deduplication
  private async normalizeAndDeduplicateProducts(products: DynamicProduct[]): Promise<DynamicProduct[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/ai/normalize-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products })
      });
      
      if (!response.ok) throw new Error('AI normalization failed');
      
      const data = await response.json();
      return data.normalizedProducts || products;
    } catch (error) {
      console.error('AI normalization error:', error);
      // Fallback to simple deduplication
      return this.simpleDeduplication(products);
    }
  }

  // Simple deduplication fallback
  private simpleDeduplication(products: DynamicProduct[]): DynamicProduct[] {
    const seen = new Set();
    return products.filter(product => {
      const key = product.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Cache results for faster subsequent searches
  private async cacheResults(query: string, products: DynamicProduct[]): Promise<void> {
    try {
      await fetch(`${this.API_BASE_URL}/cache/grocery-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, products, timestamp: Date.now() })
      });
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  // Get cached results
  private async getCachedResults(query: string): Promise<DynamicProduct[] | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/cache/grocery-search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Check if cache is still valid (1 hour)
      const cacheAge = Date.now() - data.timestamp;
      if (cacheAge > 3600000) return null;
      
      return data.products || null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  // Get smart quantity suggestions based on AI analysis
  async getSmartQuantitySuggestions(product: DynamicProduct): Promise<Array<{quantity: number, unit: string, packSize?: string, reason?: string, confidence?: number}>> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/ai/quantity-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product })
      });
      
      if (!response.ok) throw new Error('AI suggestions failed');
      
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('AI suggestions error:', error);
      // Fallback to basic suggestions
      return this.getBasicQuantitySuggestions(product);
    }
  }

  // Basic quantity suggestions fallback
  private getBasicQuantitySuggestions(product: DynamicProduct): Array<{quantity: number, unit: string, packSize?: string, reason?: string}> {
    const suggestions = [];
    
    // Get popular quantities from all sources
    const popularQuantities = product.availableQuantities
      .filter(q => q.isPopular)
      .slice(0, 3);
    
    suggestions.push(...popularQuantities.map(q => ({
      quantity: q.quantity,
      unit: q.unit,
      packSize: q.packSize,
      reason: "Most Popular"
    })));
    
    // Add smart suggestions based on category
    switch (product.category.toLowerCase()) {
      case "instant food":
        suggestions.push(
          { quantity: 1, unit: "pack", reason: "Try First" },
          { quantity: 12, unit: "pack", reason: "Bulk Buy" }
        );
        break;
      case "grains":
      case "pulses":
        suggestions.push(
          { quantity: 1, unit: "kg", reason: "Weekly Use" },
          { quantity: 5, unit: "kg", reason: "Monthly Stock" }
        );
        break;
      case "vegetables":
      case "fruits":
        suggestions.push(
          { quantity: 1, unit: "kg", reason: "Fresh Daily" },
          { quantity: 2, unit: "kg", reason: "Family Size" }
        );
        break;
    }
    
    return suggestions.slice(0, 6);
  }

  // Enhanced mock data for better fallback
  private getEnhancedMockData(query: string): DynamicProduct[] {
    const queryLower = query.toLowerCase();
    
    // Common grocery items database
    const groceryDatabase = {
      'rice': [
        { name: 'Basmati Rice', brand: 'India Gate', price: 80, category: 'Grains' },
        { name: 'Sona Masoori Rice', brand: 'Kohinoor', price: 75, category: 'Grains' },
        { name: 'Brown Rice', brand: 'Organic', price: 120, category: 'Grains' }
      ],
      'oil': [
        { name: 'Sunflower Oil', brand: 'Fortune', price: 150, category: 'Cooking Oil' },
        { name: 'Mustard Oil', brand: 'Dhara', price: 140, category: 'Cooking Oil' },
        { name: 'Coconut Oil', brand: 'Parachute', price: 200, category: 'Cooking Oil' }
      ],
      'maggi': [
        { name: 'Maggi 2-Minute Noodles', brand: 'Nestle', price: 12, category: 'Instant Food' },
        { name: 'Maggi Masala Noodles', brand: 'Nestle', price: 14, category: 'Instant Food' },
        { name: 'Maggi Atta Noodles', brand: 'Nestle', price: 16, category: 'Instant Food' }
      ],
      'onion': [
        { name: 'Fresh Red Onions', brand: 'Farm Fresh', price: 30, category: 'Vegetables' },
        { name: 'Organic Onions', brand: 'Organic', price: 45, category: 'Vegetables' }
      ],
      'tomato': [
        { name: 'Fresh Tomatoes', brand: 'Farm Fresh', price: 50, category: 'Vegetables' },
        { name: 'Cherry Tomatoes', brand: 'Organic', price: 80, category: 'Vegetables' }
      ],
      'milk': [
        { name: 'Fresh Cow Milk', brand: 'Amul', price: 60, category: 'Dairy' },
        { name: 'Buffalo Milk', brand: 'Mother Dairy', price: 65, category: 'Dairy' },
        { name: 'Toned Milk', brand: 'Amul', price: 55, category: 'Dairy' }
      ],
      'dal': [
        { name: 'Toor Dal', brand: 'Tata', price: 90, category: 'Pulses' },
        { name: 'Moong Dal', brand: 'Tata', price: 85, category: 'Pulses' },
        { name: 'Chana Dal', brand: 'Tata', price: 95, category: 'Pulses' }
      ],
      'bread': [
        { name: 'White Bread', brand: 'Britannia', price: 25, category: 'Bakery' },
        { name: 'Brown Bread', brand: 'Britannia', price: 30, category: 'Bakery' },
        { name: 'Multigrain Bread', brand: 'Britannia', price: 35, category: 'Bakery' }
      ],
      'eggs': [
        { name: 'Farm Fresh Eggs', brand: 'Farm Fresh', price: 60, category: 'Dairy' },
        { name: 'Organic Eggs', brand: 'Organic', price: 80, category: 'Dairy' }
      ],
      'salt': [
        { name: 'Iodized Salt', brand: 'Tata', price: 20, category: 'Spices' },
        { name: 'Rock Salt', brand: 'Tata', price: 25, category: 'Spices' }
      ]
    };

    // Find matching items
    const matchingItems = [];
    for (const [key, items] of Object.entries(groceryDatabase)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        matchingItems.push(...items);
      }
    }

    // If no matches found, create generic items
    if (matchingItems.length === 0) {
      matchingItems.push({
        name: `${query} - Fresh Daily`,
        brand: 'Local Store',
        price: 50,
        category: this.categorizeProduct(query)
      });
    }

    // Convert to DynamicProduct format
    return matchingItems.slice(0, 5).map((item, index) => ({
      id: `enhanced_mock_${Date.now()}_${index}`,
      name: item.name,
      brand: item.brand,
      category: item.category,
      availableQuantities: this.generatePackSizes(item.name, item.price).map(ps => ({
        quantity: ps.quantity,
        unit: ps.unit,
        packSize: ps.description,
        price: ps.price,
        isPopular: ps.isPopular
      })),
      image: `https://via.placeholder.com/200x200?text=${encodeURIComponent(item.name)}`,
      description: `Fresh ${item.name} available locally`,
      source: 'bigbasket' as const, // Use valid source
      confidence: 0.8 // High confidence for mock data
    }));
  }

  private categorizeProduct(name: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('maggi') || nameLower.includes('noodles')) return 'Instant Food';
    if (nameLower.includes('rice') || nameLower.includes('dal')) return 'Grains';
    if (nameLower.includes('oil')) return 'Cooking Oil';
    if (nameLower.includes('onion') || nameLower.includes('tomato') || nameLower.includes('potato')) return 'Vegetables';
    if (nameLower.includes('milk') || nameLower.includes('curd') || nameLower.includes('eggs')) return 'Dairy';
    if (nameLower.includes('spice') || nameLower.includes('masala') || nameLower.includes('salt')) return 'Spices';
    if (nameLower.includes('bread')) return 'Bakery';
    
    return 'Grocery';
  }

  private generatePackSizes(name: string, basePrice: number) {
    const packSizes = [];
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('maggi') || nameLower.includes('noodles')) {
      packSizes.push(
        { quantity: 1, unit: 'pack', description: '70g', price: basePrice, isPopular: true },
        { quantity: 12, unit: 'pack', description: '70g each', price: basePrice * 10, isPopular: true }
      );
    } else if (nameLower.includes('rice') || nameLower.includes('dal')) {
      packSizes.push(
        { quantity: 1, unit: 'kg', description: '1kg', price: basePrice, isPopular: true },
        { quantity: 5, unit: 'kg', description: '5kg', price: basePrice * 4.2, isPopular: true }
      );
    } else if (nameLower.includes('oil')) {
      packSizes.push(
        { quantity: 1, unit: 'liter', description: '1L', price: basePrice, isPopular: true },
        { quantity: 5, unit: 'liter', description: '5L', price: basePrice * 4.5, isPopular: true }
      );
    } else if (nameLower.includes('milk')) {
      packSizes.push(
        { quantity: 1, unit: 'liter', description: '1L', price: basePrice, isPopular: true },
        { quantity: 500, unit: 'ml', description: '500ml', price: basePrice * 0.5, isPopular: true }
      );
    } else {
      packSizes.push(
        { quantity: 1, unit: 'piece', description: '1 piece', price: basePrice, isPopular: true }
      );
    }
    
    return packSizes;
  }
}

// Export singleton instance
export const scalableGroceryAIService = new ScalableGroceryAIService();
