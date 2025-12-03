/**
 * Firebase to Supabase Data Migration Script
 * 
 * This script migrates all data from Firestore to Supabase PostgreSQL
 * 
 * Prerequisites:
 * 1. Set up Supabase project and run the schema SQL
 * 2. Add environment variables to .env.local
 * 3. Ensure Firebase Admin credentials are configured
 * 
 * Usage: npx tsx scripts/migrate-firebase-to-supabase.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Firebase Admin
let firebaseApp
try {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (projectId && clientEmail && privateKey) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    } else {
      // Fallback to default credentials
      firebaseApp = initializeApp()
    }
  } else {
    firebaseApp = getApps()[0]
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error)
  process.exit(1)
}

const firestore = getFirestore(firebaseApp)

// Initialize Supabase
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Migrate vendors from Firestore to Supabase
 */
async function migrateVendors() {
  console.log('\n📦 Migrating vendors...')
  
  try {
    const snapshot = await firestore.collection('vendors').get()
    console.log(`   Found ${snapshot.docs.length} vendors in Firestore`)

    if (snapshot.docs.length === 0) {
      console.log('   ⚠️  No vendors to migrate')
      return
    }

    const vendors = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      vendors.push({
        name: data.name || 'Unknown Vendor',
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        location: data.location || { latitude: 0, longitude: 0 },
        categories: data.categories || [],
        store_type: data.storeType || data.store_type || null,
        is_active: data.isActive ?? data.is_active ?? true,
        is_active_on_thru: data.isActiveOnThru ?? data.is_active_on_thru ?? false,
        grocery_enabled: data.groceryEnabled ?? data.grocery_enabled ?? false,
        operating_hours: data.operatingHours || data.operating_hours || null,
        fcm_token: data.fcmToken || data.fcm_token || null,
        created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert(vendors)
      .select()

    if (error) {
      console.error('   ❌ Error migrating vendors:', error.message)
      console.error('   Details:', error)
    } else {
      console.log(`   ✅ Successfully migrated ${vendors.length} vendors`)
    }
  } catch (error) {
    console.error('   ❌ Error in migrateVendors:', error)
  }
}

/**
 * Migrate orders from Firestore to Supabase
 */
async function migrateOrders() {
  console.log('\n📦 Migrating orders...')
  
  try {
    const snapshot = await firestore.collection('groceryOrders').get()
    console.log(`   Found ${snapshot.docs.length} orders in Firestore`)

    if (snapshot.docs.length === 0) {
      console.log('   ⚠️  No orders to migrate')
      return
    }

    const orders = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      orders.push({
        user_id: data.userId || 'unknown',
        status: data.status || 'pending_quotes',
        items: data.items || [],
        route: data.route || {},
        detour_preferences: data.detourPreferences || null,
        vendor_quotes: data.vendorQuotes || data.vendorResponses || [],
        selected_vendor_id: data.selectedVendorId || null,
        total_amount: data.totalAmount || null,
        created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        quote_deadline: data.quoteDeadline?.toDate().toISOString() || null,
      })
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(orders)
      .select()

    if (error) {
      console.error('   ❌ Error migrating orders:', error.message)
      console.error('   Details:', error)
    } else {
      console.log(`   ✅ Successfully migrated ${orders.length} orders`)
    }
  } catch (error) {
    console.error('   ❌ Error in migrateOrders:', error)
  }
}

/**
 * Migrate users from Firestore to Supabase
 */
async function migrateUsers() {
  console.log('\n📦 Migrating users...')
  
  try {
    const snapshot = await firestore.collection('users').get()
    console.log(`   Found ${snapshot.docs.length} users in Firestore`)

    if (snapshot.docs.length === 0) {
      console.log('   ⚠️  No users to migrate')
      return
    }

    const users = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      users.push({
        firebase_uid: doc.id,
        phone: data.phone || null,
        name: data.name || null,
        email: data.email || null,
        preferences: data.preferences || {},
        created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(users)
      .select()

    if (error) {
      console.error('   ❌ Error migrating users:', error.message)
      console.error('   Details:', error)
    } else {
      console.log(`   ✅ Successfully migrated ${users.length} users`)
    }
  } catch (error) {
    console.error('   ❌ Error in migrateUsers:', error)
  }
}

/**
 * Migrate vendor responses from Firestore to Supabase
 */
async function migrateVendorResponses() {
  console.log('\n📦 Migrating vendor responses...')
  
  try {
    const snapshot = await firestore.collection('vendor_responses').get()
    console.log(`   Found ${snapshot.docs.length} vendor responses in Firestore`)

    if (snapshot.docs.length === 0) {
      console.log('   ⚠️  No vendor responses to migrate')
      return
    }

    const responses = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      responses.push({
        order_id: data.orderId,
        vendor_id: data.vendorId,
        status: data.status || 'pending',
        total_price: data.totalPrice || data.total_price || null,
        item_prices: data.itemPrices || data.item_prices || null,
        estimated_ready_time: data.estimatedReadyTime || data.estimated_ready_time || null,
        notes: data.notes || null,
        counter_offer: data.counterOffer || data.counter_offer || null,
        responded_at: data.respondedAt?.toDate().toISOString() || new Date().toISOString(),
        created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from('vendor_responses')
      .insert(responses)
      .select()

    if (error) {
      console.error('   ❌ Error migrating vendor responses:', error.message)
      console.error('   Details:', error)
    } else {
      console.log(`   ✅ Successfully migrated ${responses.length} vendor responses`)
    }
  } catch (error) {
    console.error('   ❌ Error in migrateVendorResponses:', error)
  }
}

/**
 * Verify migration by comparing counts
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...')
  
  try {
    // Check vendors
    const firestoreVendors = await firestore.collection('vendors').count().get()
    const { count: supabaseVendors } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   Vendors: Firestore ${firestoreVendors.data().count} → Supabase ${supabaseVendors}`)

    // Check orders
    const firestoreOrders = await firestore.collection('groceryOrders').count().get()
    const { count: supabaseOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   Orders: Firestore ${firestoreOrders.data().count} → Supabase ${supabaseOrders}`)

    // Check users
    const firestoreUsers = await firestore.collection('users').count().get()
    const { count: supabaseUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   Users: Firestore ${firestoreUsers.data().count} → Supabase ${supabaseUsers}`)

    console.log('\n✅ Verification complete')
  } catch (error) {
    console.error('   ❌ Error during verification:', error)
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Firebase to Supabase Migration')
  console.log('==================================')
  console.log(`   Firebase Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  console.log(`   Supabase Project: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  
  const startTime = Date.now()

  try {
    await migrateVendors()
    await migrateUsers()
    await migrateOrders()
    await migrateVendorResponses()
    await verifyMigration()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Migration completed successfully in ${duration}s!`)
    console.log('\nNext steps:')
    console.log('1. Review the migrated data in Supabase dashboard')
    console.log('2. Update your application code to use Supabase')
    console.log('3. Test thoroughly before going to production')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
main()

















