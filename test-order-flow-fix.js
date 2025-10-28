// Test script to verify the 405 error fix
console.log('🧪 Testing order flow fix...');

async function testOrderFlow() {
  try {
    // Test the vendor API endpoint directly
    console.log('1. Testing vendor API endpoint...');
    const response = await fetch('https://merchant.kiptech.in/api/public/grocery/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: 'TEST-FIX-' + Date.now(),
        userId: 'test_user_123',
        items: [
          { id: '1', name: 'Fresh Tomatoes', quantity: 2, unit: 'kg' },
          { id: '2', name: 'Whole Milk', quantity: 1, unit: 'liter' }
        ],
        route: {
          startLocation: {
            latitude: 18.5204,
            longitude: 73.8567,
            address: 'NIBM Road, Pune'
          },
          endLocation: {
            latitude: 18.5300,
            longitude: 73.8700,
            address: 'Koregaon Park, Pune'
          },
          departureTime: new Date().toISOString()
        },
        detourPreferences: {
          maxDetourKm: 5,
          maxDetourMinutes: 15
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalAmount: 150,
        paymentStatus: 'pending'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Vendor API test successful:', result);
      return true;
    } else {
      console.error('❌ Vendor API test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testOrderFlow().then(success => {
  if (success) {
    console.log('🎉 Order flow fix verified! The 405 error should be resolved.');
  } else {
    console.log('💥 Order flow test failed. The 405 error may still exist.');
  }
});



