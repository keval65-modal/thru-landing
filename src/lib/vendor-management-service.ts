import { adminDb } from './firebaseAdmin';

export interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  fcmToken: string;
  firebaseUid?: string; // Firebase Auth UID
  isActive: boolean;
  categories: string[]; // ['grocery', 'food', 'pharmacy']
  deliveryRadius: number; // in km
  operatingHours: {
    open: string; // "09:00"
    close: string; // "21:00"
    days: string[]; // ['monday', 'tuesday', ...]
  };
  capabilities: {
    fractionalSales: boolean;
    packSplitting: boolean;
    splitFeePercent?: number;
    minOrderValue: number;
  };
  rating: number;
  totalOrders: number;
  responseTime: number; // average response time in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorLocation {
  vendorId: string;
  location: string; // "bangalore_koramangala" or "mumbai_bandra"
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
}

export class VendorManagementService {
  private readonly VENDORS_COLLECTION = 'vendors';
  private readonly VENDOR_LOCATIONS_COLLECTION = 'vendor_locations';

  /**
   * Register a new vendor
   */
  async registerVendor(vendorData: Omit<VendorProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<VendorProfile> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const vendorRef = await db.collection(this.VENDORS_COLLECTION).add({
      ...vendorData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      id: vendorRef.id,
      ...vendorData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update vendor profile
   */
  async updateVendor(vendorId: string, updates: Partial<VendorProfile>): Promise<void> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    await db.collection(this.VENDORS_COLLECTION).doc(vendorId).update({
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Get vendor by ID
   */
  async getVendor(vendorId: string): Promise<VendorProfile | null> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const vendorDoc = await db.collection(this.VENDORS_COLLECTION).doc(vendorId).get();
    
    if (!vendorDoc.exists) {
      return null;
    }

    return {
      id: vendorDoc.id,
      ...vendorDoc.data()
    } as VendorProfile;
  }

  /**
   * Get vendor by email
   */
  async getVendorByEmail(email: string): Promise<VendorProfile | null> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const vendorsSnapshot = await db.collection(this.VENDORS_COLLECTION)
      .where('email', '==', email)
      .get();
    
    if (vendorsSnapshot.empty) {
      return null;
    }

    const vendorDoc = vendorsSnapshot.docs[0];
    return {
      id: vendorDoc.id,
      ...vendorDoc.data()
    } as VendorProfile;
  }

  /**
   * Find vendors near a location
   */
  async findNearbyVendors(
    location: { lat: number; lng: number },
    radiusKm: number = 10,
    categories: string[] = ['grocery']
  ): Promise<VendorProfile[]> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    
    // For now, we'll get all active vendors and filter by categories
    // In production, you'd use GeoFirestore for proper geo-queries
    const vendorsSnapshot = await db.collection(this.VENDORS_COLLECTION)
      .where('isActive', '==', true)
      .where('categories', 'array-contains-any', categories)
      .get();

    const vendors: VendorProfile[] = [];

    vendorsSnapshot.forEach(doc => {
      const vendor = {
        id: doc.id,
        ...doc.data()
      } as VendorProfile;

      // Calculate distance (simplified - in production use proper geo-distance)
      const distance = this.calculateDistance(
        location.lat, location.lng,
        vendor.location.lat, vendor.location.lng
      );

      if (distance <= radiusKm) {
        vendors.push(vendor);
      }
    });

    // Sort by distance and rating
    return vendors.sort((a, b) => {
      const distanceA = this.calculateDistance(location.lat, location.lng, a.location.lat, a.location.lng);
      const distanceB = this.calculateDistance(location.lat, location.lng, b.location.lat, b.location.lng);
      
      if (Math.abs(distanceA - distanceB) < 1) {
        // If distances are similar, sort by rating
        return b.rating - a.rating;
      }
      return distanceA - distanceB;
    });
  }

  /**
   * Get vendor FCM tokens for notifications
   */
  async getVendorTokens(vendorIds: string[]): Promise<string[]> {
    const db = adminDb();
    if (!db) {
      throw new Error('Database not available');
    }
    const tokens: string[] = [];

    for (const vendorId of vendorIds) {
      const vendor = await this.getVendor(vendorId);
      if (vendor && vendor.fcmToken && vendor.isActive) {
        tokens.push(vendor.fcmToken);
      }
    }

    return tokens;
  }

  /**
   * Update vendor FCM token
   */
  async updateVendorToken(vendorId: string, fcmToken: string): Promise<void> {
    await this.updateVendor(vendorId, { fcmToken });
  }

  /**
   * Mark vendor as online/offline
   */
  async setVendorStatus(vendorId: string, isActive: boolean): Promise<void> {
    await this.updateVendor(vendorId, { isActive });
  }

  /**
   * Update vendor rating after order completion
   */
  async updateVendorRating(vendorId: string, newRating: number, orderCount: number): Promise<void> {
    const vendor = await this.getVendor(vendorId);
    if (!vendor) return;

    // Calculate weighted average rating
    const totalOrders = vendor.totalOrders + orderCount;
    const weightedRating = ((vendor.rating * vendor.totalOrders) + (newRating * orderCount)) / totalOrders;

    await this.updateVendor(vendorId, {
      rating: weightedRating,
      totalOrders: totalOrders
    });
  }

  /**
   * Get vendor statistics
   */
  async getVendorStats(vendorId: string): Promise<{
    totalOrders: number;
    averageRating: number;
    responseTime: number;
    completionRate: number;
  } | null> {
    const vendor = await this.getVendor(vendorId);
    if (!vendor) return null;

    return {
      totalOrders: vendor.totalOrders,
      averageRating: vendor.rating,
      responseTime: vendor.responseTime,
      completionRate: 0.95 // This would be calculated from actual order data
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create sample vendors for testing
   */
  async createSampleVendors(): Promise<void> {
    const sampleVendors = [
      {
        name: "Koramangala Fresh Mart",
        email: "vendor1@example.com",
        phone: "+919876543210",
        location: {
          lat: 12.9352,
          lng: 77.6245,
          address: "Koramangala, Bangalore"
        },
        fcmToken: "sample_token_1",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 5,
        operatingHours: {
          open: "06:00",
          close: "22:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: true,
          packSplitting: true,
          splitFeePercent: 10,
          minOrderValue: 50
        },
        rating: 4.5,
        totalOrders: 150,
        responseTime: 15
      },
      {
        name: "Indiranagar Grocery Store",
        email: "vendor2@example.com",
        phone: "+919876543211",
        location: {
          lat: 12.9716,
          lng: 77.6412,
          address: "Indiranagar, Bangalore"
        },
        fcmToken: "sample_token_2",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 3,
        operatingHours: {
          open: "07:00",
          close: "21:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: false,
          packSplitting: false,
          minOrderValue: 100
        },
        rating: 4.2,
        totalOrders: 89,
        responseTime: 25
      },
      {
        name: "HSR Layout Supermarket",
        email: "vendor3@example.com",
        phone: "+919876543212",
        location: {
          lat: 12.9116,
          lng: 77.6461,
          address: "HSR Layout, Bangalore"
        },
        fcmToken: "sample_token_3",
        isActive: true,
        categories: ["grocery"],
        deliveryRadius: 7,
        operatingHours: {
          open: "08:00",
          close: "23:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        capabilities: {
          fractionalSales: true,
          packSplitting: true,
          splitFeePercent: 5,
          minOrderValue: 75
        },
        rating: 4.7,
        totalOrders: 234,
        responseTime: 12
      }
    ];

    for (const vendor of sampleVendors) {
      try {
        await this.registerVendor(vendor);
        console.log(`✅ Created sample vendor: ${vendor.name}`);
      } catch (error) {
        console.error(`❌ Failed to create vendor ${vendor.name}:`, error);
      }
    }
  }
}

export const vendorManagementService = new VendorManagementService();
