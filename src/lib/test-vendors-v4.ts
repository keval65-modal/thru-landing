/**
 * V4 Test Vendors Configuration
 * Clean, comprehensive test vendor data for V4 deployment
 */

export interface TestVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  fcmToken: string;
  isActive: boolean;
  categories: string[];
  deliveryRadius: number;
  operatingHours: {
    open: string;
    close: string;
    days: string[];
  };
  capabilities: {
    fractionalSales: boolean;
    packSplitting: boolean;
    splitFeePercent?: number;
    minOrderValue: number;
  };
  rating: number;
  totalOrders: number;
  responseTime: number;
  groceryEnabled: boolean;
  storeCategory: string;
}

export const V4_TEST_VENDORS: TestVendor[] = [
  {
    id: 'v4_demo_grocery_1',
    name: 'FreshMart V4 Grocery',
    email: 'freshmart.v4@demo.com',
    phone: '+919876543201',
    password: 'v4demo123',
    location: {
      lat: 18.5204,
      lng: 73.8567,
      address: 'NIBM Road, Kondhwa, Pune - V4 Demo'
    },
    fcmToken: 'v4_fcm_token_grocery_1',
    isActive: true,
    categories: ['grocery'],
    deliveryRadius: 5,
    operatingHours: {
      open: '06:00',
      close: '22:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: true,
      packSplitting: true,
      splitFeePercent: 10,
      minOrderValue: 50
    },
    rating: 4.5,
    totalOrders: 150,
    responseTime: 15,
    groceryEnabled: true,
    storeCategory: 'grocery'
  },
  {
    id: 'v4_demo_grocery_2',
    name: 'QuickGrocery V4 Store',
    email: 'quickgrocery.v4@demo.com',
    phone: '+919876543202',
    password: 'v4demo123',
    location: {
      lat: 18.5304,
      lng: 73.8667,
      address: 'Camp Area, Pune - V4 Demo'
    },
    fcmToken: 'v4_fcm_token_grocery_2',
    isActive: true,
    categories: ['grocery'],
    deliveryRadius: 3,
    operatingHours: {
      open: '07:00',
      close: '21:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: false,
      packSplitting: false,
      minOrderValue: 100
    },
    rating: 4.2,
    totalOrders: 89,
    responseTime: 25,
    groceryEnabled: true,
    storeCategory: 'grocery'
  },
  {
    id: 'v4_demo_food_1',
    name: 'Spice Palace V4 Restaurant',
    email: 'spicepalace.v4@demo.com',
    phone: '+919876543203',
    password: 'v4demo123',
    location: {
      lat: 18.5404,
      lng: 73.8767,
      address: 'Kondhwa, Pune - V4 Demo'
    },
    fcmToken: 'v4_fcm_token_food_1',
    isActive: true,
    categories: ['food'],
    deliveryRadius: 4,
    operatingHours: {
      open: '10:00',
      close: '23:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: false,
      packSplitting: false,
      minOrderValue: 200
    },
    rating: 4.3,
    totalOrders: 75,
    responseTime: 20,
    groceryEnabled: false,
    storeCategory: 'food'
  },
  {
    id: 'v4_demo_pharmacy_1',
    name: 'HealthPlus V4 Pharmacy',
    email: 'healthplus.v4@demo.com',
    phone: '+919876543204',
    password: 'v4demo123',
    location: {
      lat: 18.5504,
      lng: 73.8867,
      address: 'Koregaon Park, Pune - V4 Demo'
    },
    fcmToken: 'v4_fcm_token_pharmacy_1',
    isActive: true,
    categories: ['pharmacy'],
    deliveryRadius: 6,
    operatingHours: {
      open: '08:00',
      close: '20:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: false,
      packSplitting: false,
      minOrderValue: 150
    },
    rating: 4.4,
    totalOrders: 45,
    responseTime: 30,
    groceryEnabled: false,
    storeCategory: 'pharmacy'
  }
];

export const V4_TEST_INVENTORY = {
  'v4_demo_grocery_1': [
    {
      id: 'v4_item_1',
      product_name: 'Fresh Tomatoes V4',
      display_name: 'Fresh Tomatoes',
      pack_unit: 'kg',
      pack_value: 1,
      price: 45,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1546470427-5c4b4b4b4b4b?w=300',
      notes: 'Fresh from local farm - V4 Quality',
      category: 'vegetables'
    },
    {
      id: 'v4_item_2',
      product_name: 'Whole Milk V4',
      display_name: 'Fresh Milk',
      pack_unit: 'liter',
      pack_value: 1,
      price: 60,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
      notes: 'Fresh dairy milk - V4 Premium',
      category: 'dairy'
    },
    {
      id: 'v4_item_3',
      product_name: 'White Bread V4',
      display_name: 'Fresh Bread',
      pack_unit: 'piece',
      pack_value: 1,
      price: 25,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
      notes: 'Freshly baked - V4 Artisan',
      category: 'bakery'
    }
  ],
  'v4_demo_grocery_2': [
    {
      id: 'v4_item_4',
      product_name: 'Organic Rice V4',
      display_name: 'Basmati Rice',
      pack_unit: 'kg',
      pack_value: 1,
      price: 80,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300',
      notes: 'Premium basmati - V4 Organic',
      category: 'grains'
    },
    {
      id: 'v4_item_5',
      product_name: 'Fresh Onions V4',
      display_name: 'Red Onions',
      pack_unit: 'kg',
      pack_value: 1,
      price: 35,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=300',
      notes: 'Fresh red onions - V4 Quality',
      category: 'vegetables'
    }
  ]
};

export class V4TestVendorService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_VENDOR_API_URL || 'https://merchant.kiptech.in/api';

  /**
   * Create all V4 test vendors
   */
  async createV4TestVendors(): Promise<{success: boolean, message: string, vendors: any[]}> {
    try {
      console.log('🚀 Creating V4 test vendors...');
      
      const results = [];
      for (const vendor of V4_TEST_VENDORS) {
        try {
          const response = await fetch(`${this.API_BASE_URL}/vendors`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendor)
          });

          if (response.ok) {
            const result = await response.json();
            results.push({...vendor, created: true, result});
            console.log(`✅ Created vendor: ${vendor.name}`);
          } else {
            console.log(`⚠️ Failed to create vendor: ${vendor.name}`);
            results.push({...vendor, created: false, error: 'API Error'});
          }
        } catch (error) {
          console.log(`❌ Error creating vendor ${vendor.name}:`, error);
          results.push({...vendor, created: false, error: error instanceof Error ? error.message : 'Unknown error'});
        }
      }

      return {
        success: true,
        message: `V4 test vendors creation completed. ${results.filter(r => r.created).length}/${results.length} successful.`,
        vendors: results
      };

    } catch (error) {
      console.error('❌ Error creating V4 test vendors:', error);
      return {
        success: false,
        message: `Failed to create V4 test vendors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        vendors: []
      };
    }
  }

  /**
   * Get V4 test vendor by ID
   */
  getV4TestVendor(vendorId: string): TestVendor | undefined {
    return V4_TEST_VENDORS.find(vendor => vendor.id === vendorId);
  }

  /**
   * Get all V4 test vendors
   */
  getAllV4TestVendors(): TestVendor[] {
    return V4_TEST_VENDORS;
  }

  /**
   * Get V4 test vendors by category
   */
  getV4TestVendorsByCategory(category: string): TestVendor[] {
    return V4_TEST_VENDORS.filter(vendor => vendor.categories.includes(category));
  }

  /**
   * Get V4 test inventory for a vendor
   */
  getV4TestInventory(vendorId: string): any[] {
    return (V4_TEST_INVENTORY as any)[vendorId] || [];
  }

  /**
   * Validate V4 test vendor data
   */
  validateV4TestVendor(vendor: any): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    if (!vendor.id) errors.push('Missing vendor ID');
    if (!vendor.name) errors.push('Missing vendor name');
    if (!vendor.email) errors.push('Missing vendor email');
    if (!vendor.phone) errors.push('Missing vendor phone');
    if (!vendor.location?.lat || !vendor.location?.lng) errors.push('Missing location coordinates');
    if (!vendor.categories || vendor.categories.length === 0) errors.push('Missing categories');
    if (!vendor.groceryEnabled && !vendor.storeCategory) errors.push('Missing store category');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const v4TestVendorService = new V4TestVendorService();
