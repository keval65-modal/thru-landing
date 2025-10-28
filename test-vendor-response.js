// test-vendor-response.js - Test vendor response flow
const https = require('https');

async function testVendorResponse() {
  console.log('🧪 Testing Vendor Response Flow');
  console.log('=====================================');

  // Test data for vendor response
  const vendorResponseData = {
    orderId: 'test-order-' + Date.now(),
    vendorId: 'test-vendor-123',
    vendorName: 'Test Grocery Store',
    status: 'accepted',
    totalPrice: 150.50,
    estimatedReadyTime: '2024-10-24T15:30:00Z',
    notes: 'All items available. Will be ready in 30 minutes.',
    counterOffer: null
  };

  try {
    // Send vendor response to user app
    console.log('📤 Sending vendor response to user app...');
    console.log('Response data:', vendorResponseData);

    const response = await fetch('https://app.kiptech.in/api/vendor-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vendorResponseData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Vendor response sent successfully!');
      console.log('Response:', result);
    } else {
      console.error('❌ Failed to send vendor response:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing vendor response:', error);
  }

  console.log('🎉 Vendor response test completed!');
}

testVendorResponse();


