
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used in the new streamlined flow.
// Its functionality is integrated into the new Step 2 (Category & Item Selection Hub).
export default function DeprecatedSelectShopFirstPage() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to the new Step 2 or a relevant page if accessed directly
    router.replace('/plan-trip/step-2'); 
  }, [router]);
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">Redirecting...</div>;
}
    