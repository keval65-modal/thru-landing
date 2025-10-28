// test-complete-flow.js - Test complete order flow with vendor response
const https = require('https');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Order Flow');
  console.log('=====================================');

  try {
    // Step 1: Create an order in the user app
    console.log('📦 Step 1: Creating order in user app...');
    
    const orderData = {
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
      userId: 'test-user-123'
    };

    const orderResponse = await fetch('https://app.kiptech.in/api/grocery/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!orderResponse.ok) {
      throw new Error(`Failed to create order: ${orderResponse.status} ${orderResponse.statusText}`);
    }

    const orderResult = await orderResponse.json();
    console.log('✅ Order created successfully!');
    console.log('Order ID:', orderResult.orderId);

    // Wait a moment for the order to be processed
    console.log('⏳ Waiting for order to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Send vendor response
    console.log('📤 Step 2: Sending vendor response...');
    
    const vendorResponseData = {
      orderId: orderResult.orderId,
      vendorId: 'test-vendor-123',
      vendorName: 'Test Grocery Store',
      status: 'accepted',
      totalPrice: 150.50,
      estimatedReadyTime: '2024-10-24T15:30:00Z',
      notes: 'All items available. Will be ready in 30 minutes.',
      counterOffer: null
    };

    const vendorResponse = await fetch('https://app.kiptech.in/api/vendor-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vendorResponseData)
    });

    if (vendorResponse.ok) {
      const vendorResult = await vendorResponse.json();
      console.log('✅ Vendor response sent successfully!');
      console.log('Response:', vendorResult);
    } else {
      console.error('❌ Failed to send vendor response:', vendorResponse.status, vendorResponse.statusText);
      const errorText = await vendorResponse.text();
      console.error('Error details:', errorText);
    }

    // Step 3: Check if vendor response was stored
    console.log('🔍 Step 3: Checking vendor responses...');
    
    const checkResponse = await fetch(`https://app.kiptech.in/api/vendor-responses?orderId=${orderResult.orderId}`);
    
    if (checkResponse.ok) {
      const checkResult = await checkResponse.json();
      console.log('✅ Vendor responses retrieved successfully!');
      console.log('Responses:', checkResult);
    } else {
      console.error('❌ Failed to retrieve vendor responses:', checkResponse.status, checkResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Error in complete flow test:', error);
  }

  console.log('🎉 Complete flow test completed!');
}

testCompleteFlow();


