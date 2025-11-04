// Test script to verify order flow on production app.kiptech.in
import fetch from 'node-fetch';

async function testProductionOrderFlow() {
  console.log('🧪 Testing Order Flow on Production (app.kiptech.in)');
  console.log('=' .repeat(60));
  
  // Test data
  const orderData = {
    orderId: 'prod-test-' + Date.now(),
    userId: 'test-user-123',
    items: [
      {
        id: '1',
        name: 'Fresh Apples',
        quantity: 2,
        unit: 'kg',
        category: 'fruits',
        price: 120,
        totalPrice: 240
      }
    ],
    route: {
      startLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        address: 'Pune, Maharashtra'
      },
      endLocation: {
        latitude: 18.5300,
        longitude: 73.8700,
        address: 'Destination, Pune'
      },
      departureTime: new Date().toISOString()
    },
    detourPreferences: {
      maxDetourKm: 5,
      maxDetourMinutes: 15
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
    paymentStatus: 'pending'
  };

  try {
    console.log('📦 Testing order creation on production...');
    console.log('Order ID:', orderData.orderId);
    
    // Test the order API endpoint on production
    const orderApiUrl = 'https://app.kiptech.in/api/grocery/order';
    
    const response = await fetch(orderApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Order created successfully on production!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('🎉 SUCCESS: Production order flow is working!');
        console.log('📊 Order ID:', result.orderId);
        console.log('💰 Total Amount:', result.totalAmount);
      } else {
        console.log('❌ Order failed:', result.error);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Order failed with status:', response.status);
      console.log('❌ Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing production order flow:', error.message);
  }
}

// Run the test
testProductionOrderFlow();







