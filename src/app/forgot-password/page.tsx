
"use client";

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { auth, sendOTPWithRecaptcha } from '@/lib/firebase';
import { requestPasswordResetOtpAction } from '@/app/actions/auth'; 

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';



function ForgotPasswordPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Initialize phone verification
  React.useEffect(() => {
    console.log('Forgot password page loaded');
  }, []);

  const isPhoneValid = /^\d{10}$/.test(phoneNumber);
  const canRequestOtp = isPhoneValid && !isLoading;

  const handleRequestResetOtp = async () => {
    if (!canRequestOtp) return;
    
    setIsLoading(true);
    const fullPhoneNumber = countryCode + phoneNumber;

    // Step 1: Check if user exists with this phone number via server action
    console.log(`[Client] ForgotPassword: Checking user existence for ${fullPhoneNumber}`);
    const userExistsResult = await requestPasswordResetOtpAction(fullPhoneNumber);

    if (!userExistsResult.success) {
      toast({ title: "Error", description: userExistsResult.message, variant: "destructive" });
      setIsLoading(false);
      // No reset needed
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user exists in Firebase
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      
      // Step 2: If user exists, client sends OTP using Firebase JS SDK
      const confirmationResult = await sendOTPWithRecaptcha(fullPhoneNumber, 'recaptcha-auto-container');
      setIsLoading(false);
      
      toast({ title: "OTP Sent", description: `OTP sent to ${fullPhoneNumber}`, variant: "default" });
      router.push(`/otp?phone=${encodeURIComponent(fullPhoneNumber)}&verificationId=${encodeURIComponent(confirmationResult.verificationId)}&context=forgot-password`);
      
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase OTP send error:", error);
      
      let errorMessage = "Could not send OTP. Please try again.";
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Invalid phone number format. Please check and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please wait a while before trying again.";
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = "SMS quota exceeded. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ title: "Error sending OTP", description: errorMessage, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 pt-8 md:p-6">
              {/* Phone verification container */}
      <div className="w-full max-w-md">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute top-6 left-4 md:top-8 md:left-6">
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mt-10 text-center">
            <h1 className="text-3xl font-semibold text-foreground">Forgot Password?</h1>
            <p className="mt-2 text-muted-foreground">
              Enter your phone number and we'll send you a code to reset your password.
            </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="phone-number" className="text-sm font-medium text-foreground">
              Registered Phone no <span className="text-primary">*</span>
            </Label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[100px] rounded-r-none focus:z-10">
                  <SelectValue placeholder="+91" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+91">+91 (India)</SelectItem>
                  <SelectItem value="+1">+1 (USA/CAN)</SelectItem>
                  <SelectItem value="+44">+44 (UK)</SelectItem>
                  {/* Add more country codes as needed */}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                id="phone-number"
                name="phone-number"
                placeholder="Enter number"
                className="flex-1 rounded-l-none"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0,10))}
                autoComplete="tel"
                maxLength={10}
              />
            </div>
          </div>

          <Button type="button" onClick={handleRequestResetOtp} className="w-full" disabled={!canRequestOtp}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Code
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/login')}>
            Login
          </Button>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading forgot password...</p>
        </div>
      </div>
    }>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}