// Test script to check vendors in Supabase
import fetch from 'node-fetch';

async function checkVendors() {
  console.log('🔍 Checking Vendors in Supabase...\n');
  console.log('='.repeat(70));
  
  try {
    const response = await fetch('http://localhost:9002/api/debug/supabase-vendors');
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Failed:', data.error);
      return;
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(70));
    console.log(`   Total Vendors: ${data.summary.totalVendors}`);
    console.log(`   Grocery Vendors: ${data.summary.groceryVendors}`);
    console.log(`   Vendors with Location: ${data.summary.vendorsWithLocation}`);
    console.log(`   Zeo's Pizza Found: ${data.summary.zeosPizzaFound ? '✅ YES' : '❌ NO'}`);
    
    if (data.zeosPizza) {
      console.log('\n✅ ZEO\'S PIZZA FOUND!');
      console.log('='.repeat(70));
      console.log(`   ID: ${data.zeosPizza.id}`);
      console.log(`   Name: ${data.zeosPizza.name}`);
      console.log(`   Store Type: ${data.zeosPizza.storeType}`);
      console.log(`   Is Active: ${data.zeosPizza.isActive ? '✅' : '❌'}`);
      console.log(`   Grocery Enabled: ${data.zeosPizza.groceryEnabled ? '✅' : '❌'}`);
      
      if (data.zeosPizza.location) {
        console.log(`   Location: ${data.zeosPizza.location.latitude}, ${data.zeosPizza.location.longitude}`);
        console.log(`   Distance from test point: ${data.zeosPizza.distanceFromTestPoint}`);
      } else {
        console.log(`   Location: ❌ NOT SET`);
      }
    } else {
      console.log('\n❌ ZEO\'S PIZZA NOT FOUND');
      console.log('   The vendor needs to complete signup in the vendor app.');
    }

    console.log('\n📋 ALL VENDORS:');
    console.log('='.repeat(70));
    
    if (data.vendors.length === 0) {
      console.log('   ⚠️ No vendors in database');
      console.log('   Vendors need to sign up first!');
    } else {
      data.vendors.forEach((vendor, index) => {
        console.log(`\n${index + 1}. ${vendor.name || 'No name'}`);
        console.log(`   ID: ${vendor.id}`);
        console.log(`   Type: ${vendor.storeType || 'Not set'}`);
        console.log(`   Active: ${vendor.isActive ? '✅' : '❌'}`);
        console.log(`   Grocery: ${vendor.groceryEnabled ? '✅' : '❌'}`);
        
        if (vendor.location && vendor.location.latitude) {
          console.log(`   📍 Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
          console.log(`   📏 Distance from test point: ${vendor.distanceFromTestPoint}`);
        } else {
          console.log(`   📍 Location: ❌ NOT SET - Won't appear in searches!`);
        }
        
        console.log(`   Created: ${new Date(vendor.createdAt).toLocaleString()}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    if (data.summary.totalVendors === 0) {
      console.log('   1. Complete vendor signup in vendor app');
      console.log('   2. Verify OTP and activate account');
      console.log('   3. Set store type to "grocery"');
      console.log('   4. Add location coordinates');
    } else if (data.summary.vendorsWithLocation === 0) {
      console.log('   ⚠️ Vendors exist but have no location!');
      console.log('   1. Go to vendor app');
      console.log('   2. Add store location (latitude/longitude)');
      console.log('   3. Save changes');
    } else if (data.summary.groceryVendors === 0) {
      console.log('   ⚠️ Vendors exist but not set as grocery stores!');
      console.log('   1. Go to Supabase dashboard');
      console.log('   2. Update vendors table');
      console.log('   3. Set grocery_enabled = true OR store_type = \'grocery\'');
    } else {
      console.log('   ✅ Vendors are configured correctly!');
      console.log('   Ready to test orders with actual coordinates.');
      console.log('\n   Test coordinates (Pune):');
      console.log(`   Lat: ${data.testPoint.latitude}, Lng: ${data.testPoint.longitude}`);
      console.log('\n   If vendors still don\'t show:');
      console.log('   - Ensure route is within 10km of vendor location');
      console.log('   - Check that vendor is active and grocery-enabled');
      console.log('   - Verify location coordinates are correct');
    }
    
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure dev server is running:');
    console.log('   npm run dev');
  }
}

checkVendors();














