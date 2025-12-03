// Quick check of Zeo's Pizza database state
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbtvuvkzftzxkpbcwdik.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidHZ1dmt6ZnR6eGtwYmN3ZGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyODk2NjQsImV4cCI6MjA1Mjg2NTY2NH0.vVE9A16kt_Uc1R76KNxCxT6lJLjLWFVxs3WvLFdMDfs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkZeos() {
  console.log('🔍 Checking Zeo\'s Pizza database state...\n');
  
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .ilike('name', '%zeo%');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No vendors found with "zeo" in name');
    return;
  }
  
  data.forEach(vendor => {
    console.log('📊 Vendor Details:');
    console.log('  ID:', vendor.id);
    console.log('  Name:', vendor.name);
    console.log('  Store Type:', vendor.store_type);
    console.log('  Categories:', vendor.categories);
    console.log('  Is Active:', vendor.is_active);
    console.log('  Is Active On Thru:', vendor.is_active_on_thru);
    console.log('  Grocery Enabled:', vendor.grocery_enabled);
    console.log('  Location:', vendor.location);
    console.log('');
    
    // Check what's wrong
    const issues = [];
    if (!vendor.is_active) issues.push('❌ is_active is FALSE');
    if (!vendor.is_active_on_thru) issues.push('❌ is_active_on_thru is FALSE');
    if (!vendor.location) issues.push('❌ location is NULL');
    if (vendor.store_type !== 'cafe' && vendor.store_type !== 'restaurant') {
      issues.push(`⚠️  store_type is "${vendor.store_type}" (should be "cafe" or "restaurant" for food)`);
    }
    
    if (issues.length > 0) {
      console.log('🚨 Issues Found:');
      issues.forEach(issue => console.log('  ', issue));
    } else {
      console.log('✅ All checks passed!');
    }
  });
  
  // Also check what the SupabaseVendorService.getActiveVendors() would return
  console.log('\n📊 Testing getActiveVendors() filter:');
  const { data: activeVendors, error: activeError } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_active', true);
  
  if (activeError) {
    console.error('❌ Error getting active vendors:', activeError);
  } else {
    console.log(`  Found ${activeVendors.length} active vendors total`);
    const zeosInActive = activeVendors.find(v => v.name?.toLowerCase().includes('zeo'));
    if (zeosInActive) {
      console.log('  ✅ Zeo\'s is in active vendors list');
    } else {
      console.log('  ❌ Zeo\'s is NOT in active vendors list');
    }
  }
}

checkZeos();














