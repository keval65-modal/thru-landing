// Migration script to update existing users to include displayName field
// This script can be run to update all existing users in the database

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export interface StoredUser {
  hashedPassword: string;
  displayName?: string; // Optional for backward compatibility
  profileData: {
    name: string;
    phoneNumber: string;
    email?: string;
    address?: string;
    gender?: string;
    city?: string;
    vehicleNumbers?: string[];
  };
}

export async function migrateExistingUsers(): Promise<{ success: boolean; message: string; updatedCount: number }> {
  console.log('Starting user migration...');
  
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Get all users from the users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`Found ${usersSnapshot.size} users to migrate`);
    
    let updatedCount = 0;
    const errors: string[] = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data() as StoredUser;
        
        // Skip if displayName already exists
        if (userData.displayName) {
          console.log(`User ${userDoc.id} already has displayName: ${userData.displayName}`);
          continue;
        }
        
        // Create displayName from existing profileData
        const displayName = `${userData.profileData.name},${userData.profileData.phoneNumber}`;
        
        // Update the user document with displayName
        await updateDoc(doc(db, 'users', userDoc.id), {
          displayName: displayName
        });
        
        console.log(`Updated user ${userDoc.id} with displayName: ${displayName}`);
        updatedCount++;
        
      } catch (error) {
        const errorMsg = `Failed to update user ${userDoc.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const message = updatedCount > 0 
      ? `Successfully migrated ${updatedCount} users. ${errors.length > 0 ? `Errors: ${errors.length}` : ''}`
      : 'No users needed migration.';
    
    return {
      success: true,
      message,
      updatedCount
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error}`,
      updatedCount: 0
    };
  }
}

// Function to run migration from browser console or admin panel
export async function runUserMigration() {
  console.log('🚀 Starting user migration...');
  const result = await migrateExistingUsers();
  
  if (result.success) {
    console.log('✅ Migration completed successfully!');
    console.log(`📊 ${result.message}`);
  } else {
    console.error('❌ Migration failed!');
    console.error(`💥 ${result.message}`);
  }
  
  return result;
}

