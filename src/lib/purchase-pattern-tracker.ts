// Purchase pattern tracking service
export interface PurchasePattern {
  userId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  packSize?: string;
  source: string;
  timestamp: Date;
  orderId: string;
  frequency: number; // How often this item is purchased
  lastPurchased: Date;
  totalPurchased: number; // Total quantity purchased over time
}

export interface UserPurchaseInsights {
  userId: string;
  favoriteCategories: Array<{category: string, count: number}>;
  frequentItems: Array<{itemName: string, frequency: number, lastPurchased: Date}>;
  preferredSources: Array<{source: string, count: number}>;
  averageOrderSize: number;
  purchasePatterns: PurchasePattern[];
  lastUpdated: Date;
}

export class PurchasePatternTracker {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

  // Track a new purchase
  async trackPurchase(
    userId: string,
    itemName: string,
    category: string,
    quantity: number,
    unit: string,
    packSize: string | undefined,
    source: string,
    orderId: string
  ): Promise<void> {
    try {
      const purchaseData = {
        userId,
        itemName,
        category,
        quantity,
        unit,
        packSize,
        source,
        orderId,
        timestamp: new Date().toISOString()
      };

      await fetch(`${this.API_BASE_URL}/analytics/track-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData)
      });

      // Update local patterns immediately for better UX
      this.updateLocalPatterns(purchaseData);
    } catch (error) {
      console.error('Error tracking purchase:', error);
    }
  }

  // Get user purchase insights
  async getUserInsights(userId: string): Promise<UserPurchaseInsights | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/analytics/user-insights?userId=${userId}`);
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user insights:', error);
      return null;
    }
  }

  // Get personalized recommendations based on purchase history
  async getPersonalizedRecommendations(userId: string): Promise<Array<{
    itemName: string;
    category: string;
    reason: string;
    confidence: number;
    suggestedQuantity: {quantity: number, unit: string, packSize?: string};
  }>> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/analytics/personalized-recommendations?userId=${userId}`);
      if (!response.ok) return [];
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  // Track order completion
  async trackOrderCompletion(
    userId: string,
    orderId: string,
    items: Array<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
      packSize?: string;
      source: string;
    }>,
    totalAmount: number
  ): Promise<void> {
    try {
      const orderData = {
        userId,
        orderId,
        items,
        totalAmount,
        timestamp: new Date().toISOString()
      };

      await fetch(`${this.API_BASE_URL}/analytics/track-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      // Track each item individually
      for (const item of items) {
        await this.trackPurchase(
          userId,
          item.name,
          item.category,
          item.quantity,
          item.unit,
          item.packSize,
          item.source,
          orderId
        );
      }
    } catch (error) {
      console.error('Error tracking order completion:', error);
    }
  }

  // Update local patterns for immediate feedback
  private updateLocalPatterns(purchaseData: any): void {
    // Store in localStorage for immediate access
    const key = `purchase_patterns_${purchaseData.userId}`;
    const existingPatterns = JSON.parse(localStorage.getItem(key) || '[]');
    
    const newPattern = {
      ...purchaseData,
      frequency: 1,
      lastPurchased: purchaseData.timestamp,
      totalPurchased: purchaseData.quantity
    };

    // Check if this item was purchased before
    const existingIndex = existingPatterns.findIndex(
      (pattern: any) => pattern.itemName === purchaseData.itemName && 
      pattern.category === purchaseData.category
    );

    if (existingIndex >= 0) {
      // Update existing pattern
      existingPatterns[existingIndex].frequency += 1;
      existingPatterns[existingIndex].lastPurchased = purchaseData.timestamp;
      existingPatterns[existingIndex].totalPurchased += purchaseData.quantity;
    } else {
      // Add new pattern
      existingPatterns.push(newPattern);
    }

    localStorage.setItem(key, JSON.stringify(existingPatterns));
  }

  // Get local patterns for immediate insights
  getLocalPatterns(userId: string): PurchasePattern[] {
    const key = `purchase_patterns_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  // Get frequently purchased items
  getFrequentItems(userId: string, limit: number = 5): Array<{
    itemName: string;
    frequency: number;
    lastPurchased: Date;
    category: string;
  }> {
    const patterns = this.getLocalPatterns(userId);
    
    return patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(pattern => ({
        itemName: pattern.itemName,
        frequency: pattern.frequency,
        lastPurchased: new Date(pattern.lastPurchased),
        category: pattern.category
      }));
  }

  // Get category preferences
  getCategoryPreferences(userId: string): Array<{category: string, count: number}> {
    const patterns = this.getLocalPatterns(userId);
    const categoryCount: {[key: string]: number} = {};

    patterns.forEach(pattern => {
      categoryCount[pattern.category] = (categoryCount[pattern.category] || 0) + pattern.frequency;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({category, count}))
      .sort((a, b) => b.count - a.count);
  }

  // Predict next purchase based on patterns
  predictNextPurchase(userId: string): Array<{
    itemName: string;
    category: string;
    confidence: number;
    reason: string;
  }> {
    const patterns = this.getLocalPatterns(userId);
    const predictions: Array<{
      itemName: string;
      category: string;
      confidence: number;
      reason: string;
    }> = [];

    // Find items that haven't been purchased recently but were frequent before
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    patterns.forEach(pattern => {
      const lastPurchased = new Date(pattern.lastPurchased);
      const daysSinceLastPurchase = (now.getTime() - lastPurchased.getTime()) / (1000 * 60 * 60 * 24);

      // If item was purchased frequently but not recently, suggest it
      if (pattern.frequency >= 2 && daysSinceLastPurchase > 7) {
        predictions.push({
          itemName: pattern.itemName,
          category: pattern.category,
          confidence: Math.min(pattern.frequency / 10, 0.9), // Cap at 90%
          reason: `You usually buy this every ${Math.round(daysSinceLastPurchase / pattern.frequency)} days`
        });
      }
    });

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}

// Export singleton instance
export const purchasePatternTracker = new PurchasePatternTracker();
