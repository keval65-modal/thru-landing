// Test script to verify the new deployment has the updated vendor API URL
import fetch from 'node-fetch';

async function testNewDeployment() {
  console.log('🧪 Testing New Deployment with Updated Vendor API URL');
  console.log('=' .repeat(60));
  
  // Test data
  const orderData = {
    orderId: 'new-deploy-test-' + Date.now(),
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
    console.log('📦 Testing order creation on new deployment...');
    console.log('Order ID:', orderData.orderId);
    
    // Test the new deployment
    const newDeploymentUrl = 'https://thru-user-app29082025-master-k0h0owubj-keval65-modals-projects.vercel.app/api/grocery/order';
    
    const response = await fetch(newDeploymentUrl, {
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
      console.log('✅ Order created successfully on new deployment!');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('🎉 SUCCESS: New deployment is working!');
        console.log('📊 Order ID:', result.orderId);
        console.log('🔗 Vendor App Sent:', result.vendorAppSent);
        console.log('❌ Vendor App Error:', result.vendorAppError);
        
        if (result.vendorAppSent) {
          console.log('✅ VENDOR INTEGRATION WORKING!');
        } else {
          console.log('❌ Vendor integration still failing:', result.vendorAppError);
        }
      } else {
        console.log('❌ Order failed:', result.error);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Order failed with status:', response.status);
      console.log('❌ Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing new deployment:', error.message);
  }
}

// Run the test
testNewDeployment();







