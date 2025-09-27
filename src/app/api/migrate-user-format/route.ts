import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting user format migration...');
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Get all users from the users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`Found ${usersSnapshot.size} users to check`);
    
    let updatedCount = 0;
    const errors: string[] = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        
        // Check if displayName is already in correct format
        if (userData.displayName && userData.displayName.includes(',')) {
          console.log(`User ${userDoc.id} already has correct displayName format: ${userData.displayName}`);
          continue;
        }
        
        // Check if we have the required data to create displayName
        if (!userData.profileData?.name || !userData.profileData?.phoneNumber) {
          console.log(`User ${userDoc.id} missing required data for displayName creation`);
          continue;
        }
        
        // Create displayName in correct format
        const displayName = `${userData.profileData.name},${userData.profileData.phoneNumber}`;
        
        // Update the user document with displayName
        await updateDoc(doc(db, 'users', userDoc.id), {
          displayName: displayName
        });
        
        console.log(`Updated user ${userDoc.id} with displayName: ${displayName}`);
        updatedCount++;
        
      } catch (error: any) {
        const errorMsg = `Failed to update user ${userDoc.id}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const message = updatedCount > 0 
      ? `Successfully migrated ${updatedCount} users to Name,Phone format. ${errors.length > 0 ? `Errors: ${errors.length}` : ''}`
      : 'No users needed migration.';
    
    return NextResponse.json({ 
      success: true, 
      message,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Migration failed: ${error.message}` 
    }, { status: 500 });
  }
}
