// Script to check vendors in both databases
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error) {
    console.log('⚠️ Firebase initialization skipped');
  }
}

const db = admin.firestore();

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Make sure these env vars are set:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabases() {
  console.log('🔍 Checking vendors in both databases...\n');
  console.log('='.repeat(60));
  
  // Check Supabase
  console.log('\n📊 SUPABASE VENDORS:');
  console.log('='.repeat(60));
  
  try {
    const { data: supabaseVendors, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error.message);
    } else {
      console.log(`✅ Found ${supabaseVendors.length} vendors in Supabase\n`);
      
      supabaseVendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name}`);
        console.log(`   ID: ${vendor.id}`);
        console.log(`   Type: ${vendor.store_type}`);
        console.log(`   Active: ${vendor.is_active}`);
        console.log(`   Grocery Enabled: ${vendor.grocery_enabled}`);
        console.log(`   Location: ${JSON.stringify(vendor.location)}`);
        console.log(`   Created: ${vendor.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching from Supabase:', error.message);
  }

  // Check Firebase
  console.log('\n📊 FIREBASE VENDORS:');
  console.log('='.repeat(60));
  
  try {
    const vendorsSnapshot = await db.collection('vendors').get();
    const firebaseVendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${firebaseVendors.length} vendors in Firebase\n`);
    
    if (firebaseVendors.length === 0) {
      console.log('⚠️ No vendors found in Firebase!');
      console.log('   This is why your cafe isn\'t showing up in the user app.');
      console.log('   Run the sync script to fix this:\n');
      console.log('   node sync-vendor-to-firebase.js all');
    } else {
      firebaseVendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name || 'No name'}`);
        console.log(`   ID: ${vendor.id}`);
        console.log(`   Type: ${vendor.storeCategory || vendor.storeType || 'No type'}`);
        console.log(`   Grocery Enabled: ${vendor.groceryEnabled}`);
        console.log(`   Active: ${vendor.isActive}`);
        console.log(`   Location: ${JSON.stringify(vendor.location)}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching from Firebase:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 SUMMARY:');
  console.log('='.repeat(60));
  console.log('If Supabase has vendors but Firebase doesn\'t:');
  console.log('  → Run: node sync-vendor-to-firebase.js all');
  console.log('\nIf you want to sync just one vendor:');
  console.log('  → Run: node sync-vendor-to-firebase.js one <vendor-id>');
  console.log('');
}

checkDatabases().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});















