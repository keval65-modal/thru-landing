import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface GroceryOrder {
  id?: string;
  userId: string;
  items: GroceryOrderItem[];
  route: {
    startLocation: { latitude: number; longitude: number; address: string };
    endLocation: { latitude: number; longitude: number; address: string };
    departureTime: string;
  };
  detourPreferences: {
    maxDetourKm: number;
    maxDetourMinutes: number;
  };
  status: 'pending' | 'vendor_responses' | 'vendor_selected' | 'completed' | 'cancelled';
  createdAt: any;
  vendorResponses?: VendorResponse[];
  selectedVendorId?: string;
}

export interface GroceryOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface VendorResponse {
  vendorId: string;
  vendorName: string;
  vendorLocation: { latitude: number; longitude: number };
  responseTime: any;
  status: 'accepted' | 'rejected' | 'partial';
  items: VendorItemResponse[];
  totalPrice: number;
  estimatedPickupTime?: string;
  notes?: string;
}

export interface VendorItemResponse {
  itemId: string;
  itemName: string;
  available: boolean;
  price?: number;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export class GroceryOrderService {
  /**
   * Create a new grocery order and send to vendors
   */
  static async createGroceryOrder(orderData: Omit<GroceryOrder, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Create the order
      const order: Omit<GroceryOrder, 'id'> = {
        ...orderData,
        status: 'pending',
        createdAt: new Date()
      };

      const orderRef = await addDoc(collection(db, 'groceryOrders'), order);
      
      // Find vendors along the route
      const vendors = await this.findVendorsAlongRoute(
        orderData.route.startLocation,
        orderData.route.endLocation,
        orderData.detourPreferences.maxDetourKm
      );

      // Send order to vendors (this would trigger notifications)
      await this.sendOrderToVendors(orderRef.id, vendors, orderData.items);

      return orderRef.id;

    } catch (error) {
      console.error('Error creating grocery order:', error);
      throw error;
    }
  }

  /**
   * Find vendors along the route within detour distance
   */
  static async findVendorsAlongRoute(
    startLocation: { latitude: number; longitude: number },
    endLocation: { latitude: number; longitude: number },
    maxDetourKm: number
  ): Promise<any[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Get all grocery-enabled vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const allVendors = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter vendors by grocery capability
      const groceryVendors = allVendors.filter((vendor: any) => vendor.groceryEnabled);

      // Filter vendors within detour distance of the route
      const routeVendors = groceryVendors.filter((vendor: any) => {
        if (!vendor.location || !vendor.location.latitude || !vendor.location.longitude) {
          return false;
        }

        // Calculate distance from vendor to route
        const distanceToStart = this.calculateDistance(
          startLocation.latitude,
          startLocation.longitude,
          vendor.location.latitude,
          vendor.location.longitude
        );

        const distanceToEnd = this.calculateDistance(
          endLocation.latitude,
          endLocation.longitude,
          vendor.location.latitude,
          vendor.location.longitude
        );

        // Check if vendor is within detour distance of either start or end
        return distanceToStart <= maxDetourKm || distanceToEnd <= maxDetourKm;
      });

      return routeVendors;

    } catch (error) {
      console.error('Error finding vendors along route:', error);
      throw error;
    }
  }

  /**
   * Send order to vendors (create vendor notifications)
   */
  static async sendOrderToVendors(orderId: string, vendors: any[], items: GroceryOrderItem[]): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Create notifications for each vendor
      for (const vendor of vendors) {
        const notification = {
          type: 'grocery_order',
          orderId: orderId,
          vendorId: vendor.id,
          items: items,
          createdAt: new Date(),
          status: 'pending',
          read: false
        };

        await addDoc(collection(db, 'vendor_notifications'), notification);
      }

      console.log(`Order ${orderId} sent to ${vendors.length} vendors`);

    } catch (error) {
      console.error('Error sending order to vendors:', error);
      throw error;
    }
  }

  /**
   * Get vendor responses for an order
   */
  static async getVendorResponses(orderId: string): Promise<VendorResponse[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const responsesSnapshot = await getDocs(
        query(
          collection(db, 'vendorResponses'),
          where('orderId', '==', orderId),
          orderBy('responseTime', 'desc')
        )
      );

      return responsesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

    } catch (error) {
      console.error('Error getting vendor responses:', error);
      throw error;
    }
  }

  /**
   * Listen for vendor responses (real-time updates)
   */
  static listenForVendorResponses(
    orderId: string,
    callback: (responses: VendorResponse[]) => void
  ): () => void {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const q = query(
      collection(db, 'vendorResponses'),
      where('orderId', '==', orderId),
      orderBy('responseTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const responses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      callback(responses);
    });
  }

  /**
   * Select a vendor for the order
   */
  static async selectVendor(orderId: string, vendorId: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Update order status
      const orderRef = collection(db, 'groceryOrders');
      // Note: In a real implementation, you'd use updateDoc here
      // await updateDoc(doc(orderRef, orderId), {
      //   selectedVendorId: vendorId,
      //   status: 'vendor_selected'
      // });

      console.log(`Order ${orderId} selected vendor ${vendorId}`);

    } catch (error) {
      console.error('Error selecting vendor:', error);
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
