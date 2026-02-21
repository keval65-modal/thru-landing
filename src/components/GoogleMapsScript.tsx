"use client";

import Script from 'next/script';

export function GoogleMapsScript() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  return (
    <Script
      id="google-maps-script"
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
      strategy="afterInteractive"
      onError={(e) => {
        console.error('Google Maps script failed to load:', e);
      }}
      onLoad={() => {
        console.log('Google Maps script loaded successfully');
        if (typeof window !== 'undefined') {
          console.log('Current URL:', window.location.href);
          console.log('Referrer:', document.referrer);
        }
      }}
    />
  );
}
