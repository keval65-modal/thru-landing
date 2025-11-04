// test-vendor-endpoint.js - Test the vendor API endpoint directly
const https = require('https');

async function testVendorEndpoint() {
  console.log('🧪 Testing Vendor API Endpoint');
  console.log('=====================================');

  const testOrderData = {
    orderId: 'test-order-' + Date.now(),
    userId: 'test-user-123',
    items: [
      { id: '1', name: 'Fresh Tomatoes', quantity: 2, unit: 'kg', price: 50 },
      { id: '2', name: 'Whole Milk', quantity: 1, unit: 'liter', price: 30 }
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
    createdAt: new Date().toISOString(),
    totalAmount: 80,
    paymentStatus: 'pending'
  };

  try {
    console.log('📤 Sending test order to vendor API...');
    console.log('URL: https://merchant.kiptech.in/api/public/grocery/orders');
    console.log('Data:', testOrderData);

    const response = await fetch('https://merchant.kiptech.in/api/public/grocery/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Vendor API responded successfully!');
      console.log('Response:', result);
    } else {
      console.error('❌ Vendor API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing vendor endpoint:', error);
  }

  console.log('🎉 Vendor endpoint test completed!');
}

testVendorEndpoint();




