// Simple Node.js script to run user migration
// Run with: node migrate-users.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase config (you'll need to add your config here)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function migrateUsers() {
  console.log('🚀 Starting user migration...');
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get all users from the users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${usersSnapshot.size} users to check`);
    
    let updatedCount = 0;
    const errors = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        
        // Skip if displayName already exists
        if (userData.displayName) {
          console.log(`✅ User ${userDoc.id} already has displayName: ${userData.displayName}`);
          continue;
        }
        
        // Create displayName from existing profileData
        const displayName = `${userData.profileData.name},${userData.profileData.phoneNumber}`;
        
        // Update the user document with displayName
        await updateDoc(doc(db, 'users', userDoc.id), {
          displayName: displayName
        });
        
        console.log(`🔄 Updated user ${userDoc.id} with displayName: ${displayName}`);
        updatedCount++;
        
      } catch (error) {
        const errorMsg = `❌ Failed to update user ${userDoc.id}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run the migration
migrateUsers();

