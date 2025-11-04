// Test script to verify ALL vendors with exact locations are displayed
import fetch from 'node-fetch';

console.log('🧪 Testing All Vendors Display with Exact Locations\n');
console.log('='.repeat(80));

async function testVendorDisplay() {
  try {
    // Test 1: Check all vendors in Supabase
    console.log('\n📊 TEST 1: Checking all vendors in database...\n');
    
    const vendorsResponse = await fetch('https://app.kiptech.in/api/debug/supabase-vendors');
    const vendorsData = await vendorsResponse.json();
    
    if (!vendorsData.success) {
      console.error('❌ Failed to fetch vendors');
      return;
    }
    
    console.log(`✅ Total vendors: ${vendorsData.summary.totalVendors}`);
    console.log(`✅ Grocery vendors: ${vendorsData.summary.groceryVendors}`);
    console.log(`✅ Vendors with location: ${vendorsData.summary.vendorsWithLocation}`);
    
    if (vendorsData.vendors.length === 0) {
      console.log('\n⚠️ No vendors found! Please run COMPLETE_VENDOR_DISPLAY_SOLUTION.sql first');
      return;
    }
    
    // Display all vendors with their exact coordinates
    console.log('\n📍 ALL VENDORS WITH EXACT LOCATIONS:\n');
    console.log('='.repeat(80));
    
    vendorsData.vendors.forEach((vendor, index) => {
      console.log(`\n${index + 1}. ${vendor.name}`);
      console.log(`   ID: ${vendor.id}`);
      console.log(`   Type: ${vendor.storeType || 'Not set'}`);
      console.log(`   Active: ${vendor.isActive ? '✅' : '❌'}`);
      console.log(`   Grocery: ${vendor.groceryEnabled ? '✅' : '❌'}`);
      
      if (vendor.location && vendor.location.latitude) {
        console.log(`   📍 EXACT LOCATION:`);
        console.log(`      Latitude:  ${vendor.location.latitude}`);
        console.log(`      Longitude: ${vendor.location.longitude}`);
        console.log(`      Address: ${vendor.address || 'Not provided'}`);
        console.log(`   🗺️  Google Maps: https://maps.google.com/?q=${vendor.location.latitude},${vendor.location.longitude}`);
      } else {
        console.log(`   ❌ NO LOCATION - Won't appear in searches!`);
      }
      
      console.log(`   Distance from test point: ${vendor.distanceFromTestPoint}`);
    });
    
    // Test 2: Check if vendors show up in order API
    console.log('\n\n📊 TEST 2: Checking if vendors appear in order searches...\n');
    console.log('='.repeat(80));
    
    const testRoutes = [
      {
        name: 'Pune NIBM Road Route',
        start: { latitude: 18.5204, longitude: 73.8567 },
        end: { latitude: 18.5300, longitude: 73.8700 },
        maxDetourKm: 10
      },
      {
        name: 'Near Zeo\'s Pizza',
        start: { latitude: 18.475, longitude: 73.860 },
        end: { latitude: 18.485, longitude: 73.870 },
        maxDetourKm: 5
      }
    ];
    
    for (const route of testRoutes) {
      console.log(`\n🗺️  Testing route: ${route.name}`);
      console.log(`   Start: ${route.start.latitude}, ${route.start.longitude}`);
      console.log(`   End: ${route.end.latitude}, ${route.end.longitude}`);
      console.log(`   Max Detour: ${route.maxDetourKm}km\n`);
      
      const orderData = {
        items: [{ id: '1', name: 'Test Item', quantity: 1, unit: 'piece' }],
        route: {
          startLocation: route.start,
          endLocation: route.end
        },
        detourPreferences: {
          maxDetourKm: route.maxDetourKm,
          maxDetourMinutes: 15
        },
        userId: 'test_user_' + Date.now()
      };
      
      const orderResponse = await fetch('https://app.kiptech.in/api/grocery/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const orderResult = await orderResponse.json();
      
      if (orderResult.success) {
        console.log(`   ✅ Order API Response:`);
        console.log(`      Vendors Found: ${orderResult.vendorsFound}`);
        console.log(`      Data Source: ${orderResult.dataSource}`);
        
        if (orderResult.vendors && orderResult.vendors.length > 0) {
          console.log(`\n   📍 Vendors on this route:`);
          orderResult.vendors.forEach((vendor, idx) => {
            console.log(`      ${idx + 1}. ${vendor.name}`);
            console.log(`         Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
            console.log(`         Type: ${vendor.storeType || 'N/A'}`);
          });
        } else {
          console.log(`\n   ⚠️ No vendors found on this route`);
          console.log(`      Possible reasons:`);
          console.log(`      - All vendors are farther than ${route.maxDetourKm}km`);
          console.log(`      - Vendors don't have grocery_enabled = true`);
          console.log(`      - Vendors are not active`);
        }
      } else {
        console.log(`   ❌ Order API Error: ${orderResult.error}`);
      }
    }
    
    // Test 3: Summary and recommendations
    console.log('\n\n📊 TEST 3: Summary & Recommendations\n');
    console.log('='.repeat(80));
    
    const readyVendors = vendorsData.vendors.filter(v => 
      v.isActive && 
      v.groceryEnabled && 
      v.location && 
      v.location.latitude
    );
    
    console.log(`\n✅ READY FOR ORDERS: ${readyVendors.length} vendors`);
    console.log(`⚠️  INCOMPLETE: ${vendorsData.vendors.length - readyVendors.length} vendors`);
    
    if (readyVendors.length === 0) {
      console.log('\n❌ NO VENDORS READY!');
      console.log('\n🔧 ACTION REQUIRED:');
      console.log('   1. Go to Supabase Dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Run: COMPLETE_VENDOR_DISPLAY_SOLUTION.sql');
      console.log('   4. Re-run this test\n');
    } else {
      console.log('\n✅ VENDORS ARE READY!');
      console.log('\n📍 Vendors with exact locations:');
      readyVendors.forEach(v => {
        console.log(`   • ${v.name}: ${v.location.latitude}, ${v.location.longitude}`);
      });
      
      console.log('\n🎯 Next Steps:');
      console.log('   1. Open user app: https://app.kiptech.in/grocery');
      console.log('   2. Set route near vendor locations');
      console.log('   3. Vendors should appear on map');
      console.log('   4. Place test order');
      console.log('   5. Verify vendor receives it\n');
    }
    
    // Test 4: Detailed location verification
    console.log('\n📊 TEST 4: Location Format Verification\n');
    console.log('='.repeat(80));
    
    const vendorsWithLocation = vendorsData.vendors.filter(v => v.location);
    
    if (vendorsWithLocation.length > 0) {
      console.log('\n✅ Location formats (checking conversion):');
      vendorsWithLocation.forEach(v => {
        const hasLatLng = v.location.latitude && v.location.longitude;
        const format = hasLatLng ? 'Correct {latitude, longitude}' : 'Needs conversion';
        const status = hasLatLng ? '✅' : '⚠️';
        
        console.log(`\n   ${status} ${v.name}:`);
        console.log(`      Format: ${format}`);
        if (hasLatLng) {
          console.log(`      Lat: ${v.location.latitude}`);
          console.log(`      Lng: ${v.location.longitude}`);
        } else {
          console.log(`      Raw: ${JSON.stringify(v.location)}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETE!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
  }
}

testVendorDisplay();

