// Script to activate all vendors on Thru
const https = require('https');

async function activateAllVendors() {
  try {
    console.log('🚀 Activating all vendors on Thru...\n');

    const response = await fetch('https://app.kiptech.in/api/admin/activate-all-vendors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ SUCCESS! All vendors have been activated!\n');
      console.log(`📊 Statistics:`);
      console.log(`   Total vendors: ${result.totalVendors}`);
      console.log(`   Activated: ${result.activatedCount}`);
      console.log('\n📋 Updated vendors:');
      
      result.updates.forEach((update, i) => {
        console.log(`\n   ${i + 1}. ${update.name} (${update.id})`);
        console.log(`      Categories: ${update.categories.join(', ')}`);
        console.log(`      Has coordinates: ${update.hasCoordinates ? '✅' : '❌'}`);
      });

      console.log('\n🎉 All vendors are now active on Thru!');
      console.log('\n📋 Next steps:');
      console.log('   1. Refresh: https://app.kiptech.in/test-route-discovery');
      console.log('   2. All vendors should now show as "Active"');
      console.log('   3. Plan a trip and see vendors appear on your route!');
    } else {
      console.error('❌ Failed to activate vendors:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

activateAllVendors();

