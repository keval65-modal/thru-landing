// Script to enable Zeo's Pizza for grocery orders
import fetch from 'node-fetch';

const VENDOR_ID = '8c027b0f-394c-4c3e-a20c-56ad675366d2'; // Zeo's Pizza ID

async function enableZeosPizza() {
  console.log('🔧 Enabling Zeo\'s Pizza for Grocery Orders...\n');
  console.log('='.repeat(70));
  
  try {
    const url = `https://app.kiptech.in/api/debug/fix-vendor?vendorId=${VENDOR_ID}&action=enable-grocery`;
    
    console.log('\n📡 Sending request to:', url);
    console.log('');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SUCCESS! Zeo\'s Pizza is now enabled for grocery orders!');
      console.log('='.repeat(70));
      console.log('\n📋 Updated Details:');
      console.log(`   Name: ${data.vendor.name}`);
      console.log(`   Store Type: ${data.vendor.storeType}`);
      console.log(`   Grocery Enabled: ${data.vendor.groceryEnabled ? '✅' : '❌'}`);
      console.log(`   Is Active: ${data.vendor.isActive ? '✅' : '❌'}`);
      
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 Zeo\'s Pizza will now appear in user searches!');
      console.log('\n📍 Next Steps:');
      console.log('   1. Test order placement: node test-production-order.js');
      console.log('   2. Check if vendor shows up on route');
      console.log('   3. Verify orders are being received');
      
    } else {
      console.log('❌ Failed:', data.error);
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

enableZeosPizza();

