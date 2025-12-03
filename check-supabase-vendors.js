// Check vendors in Supabase database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Set these in .env.local:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVendors() {
  console.log('🔍 Checking Supabase Vendors Database...\n');
  console.log('='.repeat(70));
  
  try {
    // Get all vendors
    const { data: allVendors, error: allError } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) throw allError;

    console.log(`\n📊 TOTAL VENDORS: ${allVendors.length}\n`);

    // Check for Zeo's Pizza specifically
    const zeosPizza = allVendors.find(v => 
      v.name?.toLowerCase().includes("zeo") || 
      v.name?.toLowerCase().includes("pizza")
    );

    if (zeosPizza) {
      console.log('✅ FOUND: Zeo\'s Pizza!\n');
      console.log('📋 Details:');
      console.log('   ID:', zeosPizza.id);
      console.log('   Name:', zeosPizza.name);
      console.log('   Email:', zeosPizza.email);
      console.log('   Phone:', zeosPizza.phone);
      console.log('   Address:', zeosPizza.address);
      console.log('   Store Type:', zeosPizza.store_type);
      console.log('   Is Active:', zeosPizza.is_active);
      console.log('   Grocery Enabled:', zeosPizza.grocery_enabled);
      console.log('   Location:', JSON.stringify(zeosPizza.location));
      console.log('   Created:', zeosPizza.created_at);
      console.log('\n' + '='.repeat(70));
    } else {
      console.log('❌ Zeo\'s Pizza NOT FOUND in database');
      console.log('   This vendor needs to complete signup first.\n');
    }

    // List all vendors
    console.log('\n📋 ALL VENDORS:\n');
    
    if (allVendors.length === 0) {
      console.log('   ⚠️ No vendors found! Vendors need to sign up first.');
    } else {
      allVendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name || 'No name'}`);
        console.log(`   ID: ${vendor.id}`);
        console.log(`   Type: ${vendor.store_type || 'Not set'}`);
        console.log(`   Active: ${vendor.is_active ? '✅' : '❌'}`);
        console.log(`   Grocery: ${vendor.grocery_enabled ? '✅' : '❌'}`);
        
        if (vendor.location) {
          console.log(`   Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
        } else {
          console.log(`   Location: ❌ NOT SET`);
        }
        
        console.log(`   Created: ${new Date(vendor.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Check active grocery vendors
    console.log('='.repeat(70));
    console.log('\n🛒 GROCERY VENDORS (Active & Grocery Enabled):\n');
    
    const groceryVendors = allVendors.filter(v => 
      v.is_active && 
      (v.grocery_enabled || v.store_type === 'grocery')
    );

    if (groceryVendors.length === 0) {
      console.log('   ⚠️ No active grocery vendors found!');
      console.log('\n   To fix this:');
      console.log('   1. Ensure vendor signup is complete');
      console.log('   2. Set is_active = true');
      console.log('   3. Set grocery_enabled = true OR store_type = \'grocery\'');
      console.log('   4. Add valid location coordinates\n');
    } else {
      groceryVendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name}`);
        console.log(`   Type: ${vendor.store_type}`);
        
        if (vendor.location) {
          console.log(`   📍 Location: ${vendor.location.latitude}, ${vendor.location.longitude}`);
          
          // Test distance from common test points
          const testPoint = { lat: 18.5204, lng: 73.8567 }; // Pune test point
          const distance = calculateDistance(
            testPoint.lat,
            testPoint.lng,
            vendor.location.latitude,
            vendor.location.longitude
          );
          console.log(`   📏 Distance from test point (Pune): ${distance.toFixed(2)} km`);
        } else {
          console.log(`   📍 Location: ❌ NOT SET - This vendor won't appear!`);
        }
        console.log('');
      });
    }

    console.log('='.repeat(70));
    console.log('\n💡 SUMMARY:\n');
    console.log(`   Total Vendors: ${allVendors.length}`);
    console.log(`   Active Grocery Vendors: ${groceryVendors.length}`);
    console.log(`   Zeo's Pizza: ${zeosPizza ? '✅ Found' : '❌ Not Found'}`);
    
    if (groceryVendors.length > 0) {
      const withLocation = groceryVendors.filter(v => v.location && v.location.latitude);
      console.log(`   Vendors with Location: ${withLocation.length}/${groceryVendors.length}`);
      
      if (withLocation.length > 0) {
        console.log('\n✅ Ready to test orders!');
        console.log('   Run: node test-production-order.js');
      } else {
        console.log('\n⚠️ No vendors have location coordinates!');
        console.log('   Vendors need to add their location in the vendor app.');
      }
    } else {
      console.log('\n⚠️ No active grocery vendors available.');
      console.log('   Complete vendor signup and activation first.');
    }
    
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

checkVendors();














