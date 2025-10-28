// Test script to verify order flow between user app and vendor app
import fetch from 'node-fetch';

async function testOrderFlow() {
  console.log('🧪 Testing Order Flow Between User App and Vendor App');
  console.log('=' .repeat(60));
  
  // Test data
  const orderData = {
    orderId: 'test-order-' + Date.now(),
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
      },
      {
        id: '2', 
        name: 'Organic Milk',
        quantity: 1,
        unit: 'liter',
        category: 'dairy',
        price: 60,
        totalPrice: 60
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
    console.log('📦 Sending order to vendor app...');
    console.log('Order ID:', orderData.orderId);
    console.log('Items:', orderData.items.length);
    
    // Send order to vendor app
    const vendorApiUrl = 'https://merchant.kiptech.in/api/public/grocery/orders';
    
    const response = await fetch(vendorApiUrl, {
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
      console.log('✅ Order sent successfully!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('🎉 SUCCESS: Order flow is working correctly!');
        console.log('📊 Vendors found:', result.vendorsFound);
        console.log('🔔 Notifications sent:', result.notificationsSent);
      } else {
        console.log('❌ Order failed:', result.error);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Order failed with status:', response.status);
      console.log('❌ Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing order flow:', error.message);
  }
}

// Run the test
testOrderFlow();