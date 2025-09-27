
/**
 * ⚠️ IMPORTANT: This file is temporarily configured to work WITHOUT reCAPTCHA
 * 
 * Firebase phone authentication requires reCAPTCHA v2, but we're experiencing
 * configuration issues. For now, this allows the app to work without reCAPTCHA.
 * 
 * TODO: Re-enable reCAPTCHA once the configuration issues are resolved
 */

import { getAuth, PhoneAuthProvider, signInWithPhoneNumber, RecaptchaVerifier, Auth, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebaseApp';

let auth: Auth | null = null;
let db: any = null;
try {
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

let recaptchaVerifierPromise: Promise<RecaptchaVerifier> | null = null;

export const createRecaptchaVerifier = async (containerId: string) => {
  if (typeof window === 'undefined') throw new Error('Window not available');
  if (!auth) throw new Error('Firebase auth not initialized');

  if (!recaptchaVerifierPromise) {
    recaptchaVerifierPromise = (async () => {
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'none';
        document.body.appendChild(container);
      }
      const v = new RecaptchaVerifier(auth as any, containerId, { size: 'invisible' });
      await v.render();
      return v;
    })();
  }

  return recaptchaVerifierPromise;
};

export const sendOTPWithRecaptcha = async (phoneNumber: string, containerId: string) => {
  try {
    if (!auth) throw new Error('Firebase auth not initialized');
    const appVerifier = await createRecaptchaVerifier(containerId);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return { success: true, confirmationResult, verificationId: confirmationResult.verificationId };
  } catch (error: any) {
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('reCAPTCHA verification failed. Please try again.');
    } else {
      throw new Error('Failed to send OTP. Please try again.');
    }
  }
};

// Verify OTP
export const verifyOTP = async (verificationId: string, otp: string) => {
  try {
    console.log('🔍 Verifying OTP...');
    
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }

    // Create credential from verification ID and OTP
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    
    // Sign in with credential using signInWithCredential
    const { signInWithCredential } = await import('firebase/auth');
    const result = await signInWithCredential(auth, credential);
    
    console.log('✅ OTP verified successfully');
    return { success: true, user: result };
    
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP. Please check and try again.');
    } else if (error.code === 'auth/invalid-verification-id') {
      throw new Error('Verification expired. Please request a new OTP.');
    } else {
      throw new Error('Failed to verify OTP. Please try again.');
    }
  }
};

// Export Firebase instances
export { auth, db };

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    grecaptcha: any;
    RecaptchaVerifier: any;
  }
}
