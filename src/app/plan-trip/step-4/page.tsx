
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used in the new streamlined flow.
// Its functionality (vendor selection based on global items) is now part of the new Step 3.
export default function DeprecatedPlanTripStep4Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/plan-trip/step-3'); 
  }, [router]);
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">Redirecting...</div>;
}
    