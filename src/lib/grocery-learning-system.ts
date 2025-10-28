// Learning system for grocery unit suggestions
interface UserPattern {
  itemName: string;
  unit: string;
  quantity: number;
  timestamp: number;
  frequency: number;
}

interface LearnedPattern {
  itemName: string;
  preferredUnit: string;
  confidence: number;
  totalUses: number;
  lastUsed: number;
}

class GroceryLearningSystem {
  private patterns: Map<string, UserPattern[]> = new Map();
  private learnedPatterns: Map<string, LearnedPattern> = new Map();
  private readonly STORAGE_KEY = 'grocery_learning_patterns';
  private readonly MIN_CONFIDENCE = 0.6;
  private readonly MIN_USES = 3;

  constructor() {
    this.loadFromStorage();
  }

  // Track user input for learning
  trackUserInput(itemName: string, unit: string, quantity: number) {
    const normalizedName = this.normalizeItemName(itemName);
    const timestamp = Date.now();
    
    // Get existing patterns for this item
    const existingPatterns = this.patterns.get(normalizedName) || [];
    
    // Check if this exact pattern exists
    const existingPattern = existingPatterns.find(p => p.unit === unit);
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency += 1;
      existingPattern.timestamp = timestamp;
      existingPattern.quantity = quantity; // Update with latest quantity
    } else {
      // Add new pattern
      existingPatterns.push({
        itemName: normalizedName,
        unit,
        quantity,
        timestamp,
        frequency: 1
      });
    }
    
    // Store updated patterns
    this.patterns.set(normalizedName, existingPatterns);
    
    // Update learned patterns
    this.updateLearnedPatterns(normalizedName);
    
    // Save to storage
    this.saveToStorage();
  }

  // Get learned suggestion for an item
  getLearnedSuggestion(itemName: string): string | null {
    const normalizedName = this.normalizeItemName(itemName);
    const learnedPattern = this.learnedPatterns.get(normalizedName);
    
    if (learnedPattern && learnedPattern.confidence >= this.MIN_CONFIDENCE) {
      return learnedPattern.preferredUnit;
    }
    
    return null;
  }

  // Get all learned patterns for debugging
  getAllLearnedPatterns(): LearnedPattern[] {
    return Array.from(this.learnedPatterns.values());
  }

  // Get user's most common units for an item
  getUserPreferences(itemName: string): { unit: string; frequency: number }[] {
    const normalizedName = this.normalizeItemName(itemName);
    const patterns = this.patterns.get(normalizedName) || [];
    
    return patterns
      .sort((a, b) => b.frequency - a.frequency)
      .map(p => ({ unit: p.unit, frequency: p.frequency }));
  }

  // Update learned patterns based on user behavior
  private updateLearnedPatterns(itemName: string) {
    const patterns = this.patterns.get(itemName) || [];
    
    if (patterns.length === 0) return;
    
    // Find the most frequent unit
    const mostFrequent = patterns.reduce((prev, current) => 
      prev.frequency > current.frequency ? prev : current
    );
    
    // Calculate confidence based on frequency and consistency
    const totalUses = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const confidence = mostFrequent.frequency / totalUses;
    
    // Only create learned pattern if confidence is high enough
    if (confidence >= this.MIN_CONFIDENCE && totalUses >= this.MIN_USES) {
      this.learnedPatterns.set(itemName, {
        itemName,
        preferredUnit: mostFrequent.unit,
        confidence,
        totalUses,
        lastUsed: Date.now()
      });
    }
  }

  // Normalize item name for consistent matching
  private normalizeItemName(itemName: string): string {
    return itemName.toLowerCase().trim();
  }

  // Save patterns to localStorage
  private saveToStorage() {
    try {
      const data = {
        patterns: Array.from(this.patterns.entries()),
        learnedPatterns: Array.from(this.learnedPatterns.entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving learning patterns:', error);
    }
  }

  // Load patterns from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.patterns = new Map(data.patterns || []);
        this.learnedPatterns = new Map(data.learnedPatterns || []);
      }
    } catch (error) {
      console.error('Error loading learning patterns:', error);
    }
  }

  // Clear all learned data (for testing)
  clearAllData() {
    this.patterns.clear();
    this.learnedPatterns.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Global instance
export const groceryLearningSystem = new GroceryLearningSystem();


