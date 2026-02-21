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
      if (args.some(arg => typeof arg === 'string' && arg.includes('ApiTargetBlockedMapError'))) {
        console.error('=== ApiTargetBlockedMapError Detected ===');
        console.error('This usually means the API key restrictions don\'t match the current domain');
        console.error('Current domain:', window.location.hostname);
        console.error('Expected patterns in Google Cloud Console:');
        console.error('  - https://thrulife.in/*');
        console.error('  - https://www.thrulife.in/* (if using www)');
        console.error('Make sure the pattern includes https:// and /* at the end');
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
