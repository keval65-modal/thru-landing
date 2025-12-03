// Quick script to sync a vendor from Supabase to Firebase
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// Initialize Supabase (replace with your credentials)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncVendorToFirebase(vendorId) {
  try {
    console.log('🔄 Syncing vendor from Supabase to Firebase...');
    
    // Get vendor from Supabase
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error) {
      console.error('❌ Error fetching vendor from Supabase:', error);
      return;
    }

    console.log('✅ Found vendor in Supabase:', vendor.name);

    // Transform to Firebase format
    const firebaseVendor = {
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      location: vendor.location, // {latitude, longitude}
      storeCategory: vendor.store_type || 'grocery',
      storeType: vendor.store_type,
      categories: vendor.categories || [],
      groceryEnabled: vendor.grocery_enabled || true,
      isActive: vendor.is_active || true,
      isActiveOnThru: vendor.is_active_on_thru || true,
      operatingHours: vendor.operating_hours,
      fcmToken: vendor.fcm_token,
      createdAt: vendor.created_at,
      updatedAt: new Date()
    };

    // Save to Firebase
    await db.collection('vendors').doc(vendorId).set(firebaseVendor);
    
    console.log('✅ Vendor synced to Firebase successfully!');
    console.log('📍 Location:', firebaseVendor.location);
    console.log('🏪 Store Type:', firebaseVendor.storeCategory);
    console.log('🛒 Grocery Enabled:', firebaseVendor.groceryEnabled);
    
  } catch (error) {
    console.error('❌ Error syncing vendor:', error);
  }
}

async function syncAllVendorsFromSupabase() {
  try {
    console.log('🔄 Syncing ALL vendors from Supabase to Firebase...\n');
    
    // Get all vendors from Supabase
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching vendors from Supabase:', error);
      return;
    }

    console.log(`📊 Found ${vendors.length} active vendors in Supabase\n`);

    // Sync each vendor
    for (const vendor of vendors) {
      console.log(`\n📦 Syncing: ${vendor.name} (${vendor.id})`);
      
      const firebaseVendor = {
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        location: vendor.location,
        storeCategory: vendor.store_type || 'grocery',
        storeType: vendor.store_type,
        categories: vendor.categories || [],
        groceryEnabled: vendor.grocery_enabled || true,
        isActive: vendor.is_active || true,
        isActiveOnThru: vendor.is_active_on_thru || true,
        operatingHours: vendor.operating_hours,
        fcmToken: vendor.fcm_token,
        createdAt: vendor.created_at,
        updatedAt: new Date()
      };

      await db.collection('vendors').doc(vendor.id).set(firebaseVendor);
      console.log(`   ✅ Synced: ${vendor.name}`);
      console.log(`   📍 Location: ${JSON.stringify(vendor.location)}`);
      console.log(`   🏪 Type: ${firebaseVendor.storeCategory}`);
    }

    console.log(`\n🎉 Successfully synced ${vendors.length} vendors to Firebase!`);
    
  } catch (error) {
    console.error('❌ Error syncing vendors:', error);
  }
}

// Run based on command line argument
const command = process.argv[2];
const vendorId = process.argv[3];

if (command === 'all') {
  syncAllVendorsFromSupabase().then(() => {
    console.log('\n✅ Sync complete!');
    process.exit(0);
  });
} else if (command === 'one' && vendorId) {
  syncVendorToFirebase(vendorId).then(() => {
    console.log('\n✅ Sync complete!');
    process.exit(0);
  });
} else {
  console.log('Usage:');
  console.log('  node sync-vendor-to-firebase.js all        - Sync all vendors');
  console.log('  node sync-vendor-to-firebase.js one <id>   - Sync one vendor by ID');
  process.exit(1);
}















