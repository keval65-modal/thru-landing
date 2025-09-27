import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    console.log('Authenticated API: Starting user migration...');
    
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
        
      } catch (error: any) {
        const errorMsg = `Failed to update user ${userDoc.id}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const message = updatedCount > 0 
      ? `Successfully migrated ${updatedCount} users. ${errors.length > 0 ? `Errors: ${errors.length}` : ''}`
      : 'No users needed migration.';
    
    return NextResponse.json({
      success: true,
      message,
      updatedCount,
      errors: errors.length
    });
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      message: `Migration failed: ${error.message}`,
      updatedCount: 0
    }, { status: 500 });
  }
}

