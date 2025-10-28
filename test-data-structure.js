// Test data creation script for Firebase
// This would be run in the Firebase console or as a Cloud Function

const testVendorData = {
  vendors: [
    {
      id: 'test_vendor_1',
      name: 'FreshMart Bangalore',
      email: 'freshmart@example.com',
      groceryEnabled: true,
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      }
    },
    {
      id: 'test_vendor_2', 
      name: 'QuickGrocery Store',
      email: 'quickgrocery@example.com',
      groceryEnabled: true,
      location: {
        latitude: 12.9750,
        longitude: 77.6000
      }
    }
  ],
  inventory: [
    // FreshMart inventory
    {
      vendorId: 'test_vendor_1',
      items: [
        {
          id: 'item_1',
          product_name: 'Fresh Tomatoes 1kg',
          display_name: 'Fresh Tomatoes',
          pack_unit: 'kg',
          pack_value: 1,
          price: 45,
          isAvailable: true,
          image: 'https://example.com/tomato.jpg',
          notes: 'Fresh from local farm'
        },
        {
          id: 'item_2',
          product_name: 'Whole Milk 1L',
          display_name: 'Fresh Milk',
          pack_unit: 'liter',
          pack_value: 1,
          price: 60,
          isAvailable: true,
          image: 'https://example.com/milk.jpg',
          notes: 'Fresh dairy milk'
        },
        {
          id: 'item_3',
          product_name: 'White Bread Loaf',
          display_name: 'Fresh Bread',
          pack_unit: 'piece',
          pack_value: 1,
          price: 25,
          isAvailable: true,
          image: 'https://example.com/bread.jpg',
          notes: 'Freshly baked'
        }
      ]
    },
    // QuickGrocery inventory
    {
      vendorId: 'test_vendor_2',
      items: [
        {
          id: 'item_4',
          product_name: 'Organic Tomatoes 500g',
          display_name: 'Organic Tomatoes',
          pack_unit: 'gram',
          pack_value: 500,
          price: 30,
          isAvailable: true,
          image: 'https://example.com/organic-tomato.jpg',
          notes: 'Organic certified'
        },
        {
          id: 'item_5',
          product_name: 'Low Fat Milk 1L',
          display_name: 'Low Fat Milk',
          pack_unit: 'liter',
          pack_value: 1,
          price: 55,
          isAvailable: true,
          image: 'https://example.com/lowfat-milk.jpg',
          notes: 'Low fat dairy milk'
        }
      ]
    }
  ]
};

console.log('Test data structure created. This would be added to Firebase collections:');
console.log('- vendors collection');
console.log('- vendors/{vendorId}/inventory collection');
console.log('');
console.log('Expected search results:');
console.log('- Search "tomato" → Should find 2 items from both vendors');
console.log('- Search "milk" → Should find 2 items from both vendors');
console.log('- Search "bread" → Should find 1 item from FreshMart');
console.log('');
console.log('Price comparison:');
console.log('- Tomatoes: ₹45/kg (FreshMart) vs ₹30/500g (QuickGrocery)');
console.log('- Milk: ₹60/L (FreshMart) vs ₹55/L (QuickGrocery)');


