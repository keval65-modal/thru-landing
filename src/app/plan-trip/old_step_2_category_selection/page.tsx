
"use client";

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// This page is no longer used. Redirect to the new Step 1 or Step 2.
function DeprecatedCategorySelectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const start = searchParams.get("start");
    const destination = searchParams.get("destination");
    if (start && destination) {
      router.replace(`/plan-trip/step-2?start=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}`);
    } else {
      router.replace('/plan-trip/step-1'); 
    }
  }, [router, searchParams]);
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">Redirecting...</div>;
}

export default function DeprecatedCategorySelectionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    }>
      <DeprecatedCategorySelectionPageContent />
    </Suspense>
  );
}

    