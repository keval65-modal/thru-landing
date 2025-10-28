// Simple Firebase test script
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase config (same as in your app)
const firebaseConfig = {
  apiKey: "AIzaSyBqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Test 1: Get vendors collection
    console.log('📊 Testing vendors collection...');
    const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
    const vendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${vendors.length} vendors`);
    
    // Test 2: Check grocery-enabled vendors
    const groceryVendors = vendors.filter((vendor: any) => vendor.groceryEnabled);
    console.log(`🛒 Found ${groceryVendors.length} grocery-enabled vendors`);
    
    // Test 3: Check inventory for first grocery vendor
    if (groceryVendors.length > 0) {
      const firstVendor = groceryVendors[0];
      console.log(`📦 Testing inventory for vendor: ${firstVendor.name || firstVendor.id}`);
      
      try {
        const inventorySnapshot = await getDocs(
          collection(db, 'vendors', firstVendor.id, 'inventory')
        );
        console.log(`✅ Found ${inventorySnapshot.docs.length} inventory items`);
        
        // Show first few items
        inventorySnapshot.docs.slice(0, 3).forEach(doc => {
          const item = doc.data();
          console.log(`  - ${item.product_name || item.display_name}: ₹${item.price || 0}`);
        });
      } catch (error) {
        console.log('❌ No inventory found for this vendor');
      }
    }
    
    // Test 4: Check grocery-skus collection
    try {
      const skusSnapshot = await getDocs(collection(db, 'grocery-skus'));
      console.log(`🏷️ Found ${skusSnapshot.docs.length} grocery SKUs`);
    } catch (error) {
      console.log('❌ No grocery-skus collection found');
    }
    
    console.log('🎉 Firebase test completed successfully!');
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
  }
}

// Run the test
testFirebaseConnection();


