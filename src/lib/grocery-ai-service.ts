// AI-powered grocery search service with quantity detection
export interface GroceryProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
  availableQuantities: Array<{
    quantity: number;
    unit: string;
    packSize?: string;
    price?: number;
    isPopular?: boolean;
  }>;
  image?: string;
  description?: string;
}

// Comprehensive product database with real pack sizes
const GROCERY_PRODUCTS_DATABASE: GroceryProduct[] = [
  // Instant Noodles & Pasta
  {
    id: "maggi-noodles",
    name: "Maggi Noodles",
    brand: "Maggi",
    category: "Instant Food",
    availableQuantities: [
      { quantity: 1, unit: "pack", packSize: "70g", isPopular: true },
      { quantity: 2, unit: "pack", packSize: "70g each" },
      { quantity: 4, unit: "pack", packSize: "70g each" },
      { quantity: 8, unit: "pack", packSize: "70g each" },
      { quantity: 12, unit: "pack", packSize: "70g each", isPopular: true },
      { quantity: 1, unit: "box", packSize: "12 packs" },
    ]
  },
  {
    id: "top-ramen",
    name: "Top Ramen",
    brand: "Nissin",
    category: "Instant Food",
    availableQuantities: [
      { quantity: 1, unit: "pack", packSize: "80g" },
      { quantity: 5, unit: "pack", packSize: "80g each" },
      { quantity: 10, unit: "pack", packSize: "80g each" },
    ]
  },

  // Rice & Grains
  {
    id: "basmati-rice",
    name: "Basmati Rice",
    brand: "India Gate",
    category: "Grains",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg", isPopular: true },
      { quantity: 10, unit: "kg", packSize: "10kg" },
      { quantity: 25, unit: "kg", packSize: "25kg" },
    ]
  },
  {
    id: "dal-moong",
    name: "Moong Dal",
    category: "Pulses",
    availableQuantities: [
      { quantity: 500, unit: "g", packSize: "500g", isPopular: true },
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg" },
    ]
  },

  // Cooking Oil
  {
    id: "sunflower-oil",
    name: "Sunflower Oil",
    brand: "Fortune",
    category: "Cooking Oil",
    availableQuantities: [
      { quantity: 1, unit: "liter", packSize: "1L", isPopular: true },
      { quantity: 2, unit: "liter", packSize: "2L" },
      { quantity: 5, unit: "liter", packSize: "5L", isPopular: true },
      { quantity: 15, unit: "liter", packSize: "15L" },
    ]
  },

  // Spices & Seasonings
  {
    id: "turmeric-powder",
    name: "Turmeric Powder",
    brand: "Everest",
    category: "Spices",
    availableQuantities: [
      { quantity: 50, unit: "g", packSize: "50g", isPopular: true },
      { quantity: 100, unit: "g", packSize: "100g", isPopular: true },
      { quantity: 200, unit: "g", packSize: "200g" },
      { quantity: 500, unit: "g", packSize: "500g" },
    ]
  },
  {
    id: "garam-masala",
    name: "Garam Masala",
    brand: "MDH",
    category: "Spices",
    availableQuantities: [
      { quantity: 25, unit: "g", packSize: "25g" },
      { quantity: 50, unit: "g", packSize: "50g", isPopular: true },
      { quantity: 100, unit: "g", packSize: "100g", isPopular: true },
    ]
  },

  // Dairy Products
  {
    id: "milk-amul",
    name: "Amul Milk",
    brand: "Amul",
    category: "Dairy",
    availableQuantities: [
      { quantity: 500, unit: "ml", packSize: "500ml", isPopular: true },
      { quantity: 1, unit: "liter", packSize: "1L", isPopular: true },
      { quantity: 2, unit: "liter", packSize: "2L" },
    ]
  },
  {
    id: "curd-amul",
    name: "Amul Curd",
    brand: "Amul",
    category: "Dairy",
    availableQuantities: [
      { quantity: 200, unit: "g", packSize: "200g", isPopular: true },
      { quantity: 500, unit: "g", packSize: "500g", isPopular: true },
      { quantity: 1, unit: "kg", packSize: "1kg" },
    ]
  },

  // Vegetables (by weight)
  {
    id: "onions",
    name: "Onions",
    category: "Vegetables",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg", isPopular: true },
      { quantity: 10, unit: "kg", packSize: "10kg" },
    ]
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    category: "Vegetables",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg" },
    ]
  },
  {
    id: "potatoes",
    name: "Potatoes",
    category: "Vegetables",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg", isPopular: true },
      { quantity: 10, unit: "kg", packSize: "10kg" },
    ]
  },

  // Fruits
  {
    id: "bananas",
    name: "Bananas",
    category: "Fruits",
    availableQuantities: [
      { quantity: 1, unit: "dozen", packSize: "12 pieces", isPopular: true },
      { quantity: 2, unit: "dozen", packSize: "24 pieces" },
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
    ]
  },
  {
    id: "apples",
    name: "Apples",
    category: "Fruits",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 5, unit: "kg", packSize: "5kg" },
    ]
  },

  // Beverages
  {
    id: "coca-cola",
    name: "Coca Cola",
    brand: "Coca Cola",
    category: "Beverages",
    availableQuantities: [
      { quantity: 1, unit: "bottle", packSize: "600ml", isPopular: true },
      { quantity: 2, unit: "bottle", packSize: "600ml each" },
      { quantity: 6, unit: "bottle", packSize: "600ml each", isPopular: true },
      { quantity: 12, unit: "bottle", packSize: "600ml each" },
      { quantity: 1, unit: "can", packSize: "330ml" },
      { quantity: 6, unit: "can", packSize: "330ml each" },
    ]
  },

  // Snacks
  {
    id: "lays-chips",
    name: "Lays Chips",
    brand: "Lays",
    category: "Snacks",
    availableQuantities: [
      { quantity: 1, unit: "pack", packSize: "50g", isPopular: true },
      { quantity: 2, unit: "pack", packSize: "50g each" },
      { quantity: 6, unit: "pack", packSize: "50g each" },
      { quantity: 1, unit: "pack", packSize: "150g", isPopular: true },
    ]
  },

  // Cleaning Products
  {
    id: "detergent-surf",
    name: "Surf Excel",
    brand: "Surf",
    category: "Cleaning",
    availableQuantities: [
      { quantity: 1, unit: "kg", packSize: "1kg", isPopular: true },
      { quantity: 2, unit: "kg", packSize: "2kg" },
      { quantity: 4, unit: "kg", packSize: "4kg", isPopular: true },
      { quantity: 1, unit: "liter", packSize: "1L" },
    ]
  },
];

// AI-powered search function
export class GroceryAIService {
  private products: GroceryProduct[] = GROCERY_PRODUCTS_DATABASE;

  // Smart search with fuzzy matching and category detection
  async searchProducts(query: string): Promise<GroceryProduct[]> {
    if (!query.trim()) return [];

    const normalizedQuery = query.toLowerCase().trim();
    
    // Direct name matches (highest priority)
    const directMatches = this.products.filter(product => 
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.brand?.toLowerCase().includes(normalizedQuery)
    );

    // Fuzzy matches for common variations
    const fuzzyMatches = this.products.filter(product => {
      const name = product.name.toLowerCase();
      const brand = product.brand?.toLowerCase() || '';
      
      // Handle common variations
      const variations = [
        normalizedQuery,
        normalizedQuery.replace('s', ''), // singular/plural
        normalizedQuery + 's', // add s
        normalizedQuery.replace('ies', 'y'), // berries -> berry
        normalizedQuery.replace('y', 'ies'), // berry -> berries
      ];

      return variations.some(variation => 
        name.includes(variation) || brand.includes(variation)
      );
    });

    // Category-based matches
    const categoryMatches = this.products.filter(product => 
      product.category.toLowerCase().includes(normalizedQuery)
    );

    // Combine and deduplicate results
    const allMatches = [...directMatches, ...fuzzyMatches, ...categoryMatches];
    const uniqueMatches = allMatches.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );

    // Sort by relevance (direct matches first, then by popularity)
    return uniqueMatches.sort((a, b) => {
      const aIsDirect = directMatches.includes(a);
      const bIsDirect = directMatches.includes(b);
      
      if (aIsDirect && !bIsDirect) return -1;
      if (!aIsDirect && bIsDirect) return 1;
      
      // If both are direct matches or both are not, sort by popularity
      const aHasPopular = a.availableQuantities.some(q => q.isPopular);
      const bHasPopular = b.availableQuantities.some(q => q.isPopular);
      
      if (aHasPopular && !bHasPopular) return -1;
      if (!aHasPopular && bHasPopular) return 1;
      
      return 0;
    }).slice(0, 10); // Limit to top 10 results
  }

  // Get product by ID
  getProductById(id: string): GroceryProduct | undefined {
    return this.products.find(product => product.id === id);
  }

  // Get popular quantities for a product (most commonly available sizes)
  getPopularQuantities(product: GroceryProduct): Array<{quantity: number, unit: string, packSize?: string}> {
    return product.availableQuantities
      .filter(q => q.isPopular)
      .map(q => ({ quantity: q.quantity, unit: q.unit, packSize: q.packSize }));
  }

  // Get all available quantities for a product
  getAllQuantities(product: GroceryProduct): Array<{quantity: number, unit: string, packSize?: string}> {
    return product.availableQuantities
      .map(q => ({ quantity: q.quantity, unit: q.unit, packSize: q.packSize }));
  }

  // Smart quantity suggestions based on product type
  getSmartQuantitySuggestions(product: GroceryProduct): Array<{quantity: number, unit: string, packSize?: string, reason?: string}> {
    const suggestions = [];
    const popularQuantities = this.getPopularQuantities(product);
    
    // Add popular quantities first
    suggestions.push(...popularQuantities.map(q => ({ ...q, reason: "Most Popular" })));
    
    // Add smart suggestions based on product category
    switch (product.category) {
      case "Instant Food":
        suggestions.push(
          { quantity: 1, unit: "pack", reason: "Try First" },
          { quantity: 12, unit: "pack", reason: "Bulk Buy" }
        );
        break;
      case "Grains":
      case "Pulses":
        suggestions.push(
          { quantity: 1, unit: "kg", reason: "Weekly Use" },
          { quantity: 5, unit: "kg", reason: "Monthly Stock" }
        );
        break;
      case "Vegetables":
      case "Fruits":
        suggestions.push(
          { quantity: 1, unit: "kg", reason: "Fresh Daily" },
          { quantity: 2, unit: "kg", reason: "Family Size" }
        );
        break;
      case "Dairy":
        suggestions.push(
          { quantity: 1, unit: "liter", reason: "Daily Use" },
          { quantity: 2, unit: "liter", reason: "Family Size" }
        );
        break;
    }
    
    // Remove duplicates and limit to 6 suggestions
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.quantity === suggestion.quantity && s.unit === suggestion.unit)
    );
    
    return uniqueSuggestions.slice(0, 6);
  }
}

// Export singleton instance
export const groceryAIService = new GroceryAIService();





