
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import Firestore functions

// This type needs to be defined or imported if it's used elsewhere,
// for now, defining it based on usage.
export interface StoredUser {
  hashedPassword: string;
  displayName: string; // Format: "UserName,Number" for easy identification in Firebase console
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

// This schema defines the data expected when creating/updating a user profile.
const UserProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phoneNumber: z.string(), // Already validated upstream via OTP
  email: z.string().email("Invalid email format.").optional().or(z.literal('')),
  password: z.string().min(8, "Password must be at least 8 characters."), 
  address: z.string().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  vehicleNumbers: z.array(z.string()).optional(),
});

type UserProfileInput = z.infer<typeof UserProfileSchema>;

interface ActionResponse {
  success: boolean;
  message: string;
  userId?: string; 
  error?: string;
}

export async function checkUserExistsAction(phoneNumber: string): Promise<ActionResponse> {
  console.log('Checking if user exists for phone:', phoneNumber);

  try {
    if (!db) {
      console.error("[Server Action] checkUserExistsAction: Firestore not initialized");
      return { success: false, message: 'Database not available. Please try again later.' };
    }
    
    const userDoc = await getDoc(doc(db, "users", phoneNumber));
    const userExists = userDoc.exists();
    
    console.log(`User exists check for ${phoneNumber}:`, userExists);
    
    return { 
      success: true, 
      message: userExists ? 'User exists' : 'User does not exist',
      userId: userExists ? phoneNumber : undefined
    };
  } catch (error) {
    console.error('Error checking user existence:', error);
    return { success: false, message: 'Failed to check user existence.', error: (error as Error).message };
  }
}

export async function saveUserProfileAction(profileData: UserProfileInput): Promise<ActionResponse> {
  console.log('Attempting to save user profile to Firestore...');

  const validation = UserProfileSchema.safeParse(profileData);
  if (!validation.success) {
    console.error('User profile data validation failed:', validation.error.flatten());
    return { 
      success: false, 
      message: 'Invalid profile data provided.', 
      error: JSON.stringify(validation.error.flatten().fieldErrors) 
    };
  }

  const { password, ...userDataToSave } = validation.data;

  try {
    if (!db) {
      console.error("[Server Action] saveUserProfileAction: Firestore not initialized");
      return { success: false, message: 'Database not available. Please try again later.' };
    }
    
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(`Password hashed for user: ${userDataToSave.phoneNumber}`);

    const userToStore: StoredUser = {
      hashedPassword,
      displayName: `${userDataToSave.name},${userDataToSave.phoneNumber}`, // Format: "UserName,Number"
      profileData: {
        name: userDataToSave.name,
        phoneNumber: userDataToSave.phoneNumber,
        email: userDataToSave.email || undefined,
        address: userDataToSave.address || undefined,
        gender: userDataToSave.gender || undefined,
        city: userDataToSave.city || undefined,
        vehicleNumbers: userDataToSave.vehicleNumbers || undefined,
      }
    };

    // Save to Firestore
    // Using phoneNumber as the document ID in a 'users' collection
    await setDoc(doc(db, "users", userDataToSave.phoneNumber), userToStore);
    
    console.log('User profile saved successfully to Firestore. User Phone (Document ID):', userDataToSave.phoneNumber);

    // Note: Firebase Auth displayName update should be handled on the client side
    // since server actions don't have access to the current user's auth state

    return { success: true, message: 'Profile created and password set successfully! (Stored in Firestore)', userId: userDataToSave.phoneNumber };
  } catch (error) {
    console.error('Error during profile save (hashing or Firestore write):', error);
    return { success: false, message: 'Failed to save profile due to an internal error.', error: (error as Error).message };
  }
}
    
