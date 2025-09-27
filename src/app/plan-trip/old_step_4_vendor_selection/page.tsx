
"use client";

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// This page's logic is now integrated into the new /plan-trip/step-3.
// Redirect to avoid errors if accessed directly.
function DeprecatedVendorSelectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const start = searchParams.get("start");
    const destination = searchParams.get("destination");
    // Attempt to reconstruct a valid path to the new step 3 if possible, or fallback
    if (start && destination) {
        const globalItems = searchParams.get("selectedGlobalItemsData") || "{}";
        const shopSpecificItems = searchParams.get("selectedShopSpecificItemsData") || "{}";
         router.replace(`/plan-trip/step-3?start=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}&selectedGlobalItemsData=${encodeURIComponent(globalItems)}&selectedShopSpecificItemsData=${encodeURIComponent(shopSpecificItems)}`);
    } else {
      router.replace('/plan-trip/step-1'); 
    }
  }, [router, searchParams]);
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">Redirecting...</div>;
}

export default function DeprecatedVendorSelectionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    }>
      <DeprecatedVendorSelectionPageContent />
    </Suspense>
  );
}

    