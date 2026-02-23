"use client";

import { useEffect } from "react";

export function GoogleMapsDebug() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Log referrer information
    console.log('=== Google Maps Debug Info ===');
    console.log('Current URL:', window.location.href);
    console.log('Current Origin:', window.location.origin);
    console.log('Document Referrer:', document.referrer);
    console.log('Google Maps Available:', typeof window.google !== 'undefined');
    console.log('Google Maps Places Available:', typeof window.google?.maps?.places !== 'undefined');
    
    // Check for API errors
    const originalError = console.error;
    console.error = (...args) => {
      // Use originalError to avoid infinite recursion
      try {
        if (args.some(arg => typeof arg === 'string' && arg.includes('ApiTargetBlockedMapError'))) {
          originalError('=== ApiTargetBlockedMapError Detected ===');
          originalError('This usually means the API key restrictions don\'t match the current domain');
          originalError('Current domain:', window.location.hostname);
          originalError('Expected patterns in Google Cloud Console:');
          originalError('  - https://thrulife.in/*');
          originalError('  - https://www.thrulife.in/* (if using www)');
          originalError('Make sure the pattern includes https:// and /* at the end');
        }
      } catch (e) {
        // Fallback if there's any error in the check
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
