import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

export interface VendorInventoryItem {
  id: string;
  product_name: string;
  display_name: string;
  pack_unit: string;
  pack_value: number;
  price: number;
  isAvailable: boolean;
  image?: string;
  notes?: string;
  vendorId: string;
  vendorName: string;
  vendorLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface GrocerySearchResult {
  items: VendorInventoryItem[];
  totalFound: number;
  vendorsSearched: number;
}

export class FirebaseGroceryService {
  /**
   * Search for grocery items across all vendors in Firebase
   */
  static async searchGroceryItems(
    searchQuery: string,
    location?: { latitude: number; longitude: number },
    maxDetourKm: number = 5
  ): Promise<GrocerySearchResult> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const results: VendorInventoryItem[] = [];
      let vendorsSearched = 0;

      // Get all vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const vendors = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter vendors by grocery capability and location if provided
      let relevantVendors = vendors.filter((vendor: any) => vendor.groceryEnabled);
      
      if (location) {
        relevantVendors = relevantVendors.filter((vendor: any) => {
          if (!vendor.location || !vendor.location.latitude || !vendor.location.longitude) {
            return false;
          }
          
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            vendor.location.latitude,
            vendor.location.longitude
          );
          
          return distance <= maxDetourKm;
        });
      }

      // Search inventory for each relevant vendor
      for (const vendor of relevantVendors) {
        try {
          const inventorySnapshot = await getDocs(
            collection(db, 'vendors', vendor.id, 'inventory')
          );
          
          vendorsSearched++;
          
          inventorySnapshot.docs.forEach(doc => {
            const item = doc.data();
            const itemName = item.product_name || item.display_name || '';
            
            // Simple text matching (can be enhanced with fuzzy search)
            if (itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({
                id: doc.id,
                product_name: item.product_name || '',
                display_name: item.display_name || item.product_name || '',
                pack_unit: item.pack_unit || 'piece',
                pack_value: item.pack_value || 1,
                price: item.price || 0,
                isAvailable: item.isAvailable !== false,
                image: item.image,
                notes: item.notes,
                vendorId: vendor.id,
                vendorName: (vendor as any).name || 'Unknown Vendor',
                vendorLocation: (vendor as any).location
              });
            }
          });
        } catch (error) {
          console.error(`Error searching inventory for vendor ${vendor.id}:`, error);
        }
      }

      // Sort by price (lowest first)
      results.sort((a, b) => a.price - b.price);

      return {
        items: results,
        totalFound: results.length,
        vendorsSearched
      };

    } catch (error) {
      console.error('Error searching grocery items:', error);
      throw error;
    }
  }

  /**
   * Get vendor inventory for a specific vendor
   */
  static async getVendorInventory(vendorId: string): Promise<VendorInventoryItem[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const inventorySnapshot = await getDocs(
        collection(db, 'vendors', vendorId, 'inventory')
      );

      const vendorDoc = await getDocs(collection(db, 'vendors'));
      const vendor = vendorDoc.docs.find(doc => doc.id === vendorId);
      const vendorData = vendor?.data();

      return inventorySnapshot.docs.map(doc => {
        const item = doc.data();
        return {
          id: doc.id,
          product_name: item.product_name || '',
          display_name: item.display_name || item.product_name || '',
          pack_unit: item.pack_unit || 'piece',
          pack_value: item.pack_value || 1,
          price: item.price || 0,
          isAvailable: item.isAvailable !== false,
          image: item.image,
          notes: item.notes,
          vendorId: vendorId,
          vendorName: (vendorData as any)?.name || 'Unknown Vendor',
          vendorLocation: (vendorData as any)?.location
        };
      });

    } catch (error) {
      console.error('Error getting vendor inventory:', error);
      throw error;
    }
  }

  /**
   * Get all grocery-enabled vendors
   */
  static async getGroceryVendors(): Promise<any[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      return vendorsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((vendor: any) => vendor.groceryEnabled);

    } catch (error) {
      console.error('Error getting grocery vendors:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
