
"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ChevronLeft, X as ClearIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkUserExistsAction } from '@/app/actions/user';

const NUM_OTP_INPUTS = 6;

function OTPPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [otp, setOtp] = useState<string[]>(new Array(NUM_OTP_INPUTS).fill(''));
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneNumber = searchParams.get('phone') || '';
  const verificationId = searchParams.get('verificationId') || '';
  const loginContext = searchParams.get('context') || '';

  // Phone verification setup
  useEffect(() => {
    if (!phoneNumber || !verificationId) {
      toast({ title: "Error", description: "Missing phone number or verification ID. Please try the process again.", variant: "destructive" });
      router.push('/login');
      return;
    }
  }, [phoneNumber, verificationId, router, toast, loginContext]);
  
  useEffect(() => {
    console.log('OTP page loaded');
    
    // Auto-read OTP from SMS (if supported by browser)
    if ('OTPCredential' in window) {
      const abortController = new AbortController();
      
      navigator.credentials.get({
        // @ts-ignore - OTP API is experimental and not fully typed
        otp: { transport: ['sms'] },
        signal: abortController.signal,
      }).then((otp: any) => {
        if (otp && otp.code) {
          const otpCode = otp.code;
          if (otpCode.length === NUM_OTP_INPUTS) {
            const newOtp = otpCode.split('');
            setOtp(newOtp);
            handleSubmitOtp(newOtp);
          }
        }
      }).catch((error) => {
        console.log('Auto-read OTP not available:', error);
      });
      
      return () => {
        abortController.abort();
      };
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (timer > 0) {
      intervalId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSubmitOtp = async (currentOtp: string[]) => {
    if (currentOtp.some(digit => digit === '') || !verificationId) return;
    
    setIsLoading(true);
    const enteredOtp = currentOtp.join('');
    
    try {
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      
      const credential = PhoneAuthProvider.credential(verificationId, enteredOtp);
      const signInResult = await signInWithCredential(auth, credential);
      const user = signInResult.user;
      
      setIsLoading(false);
      toast({ title: "Verification Success!", description: "Phone number verified successfully.", variant: "default" });
      
      // Get the phone number for user check
      const phoneToCheck = user.phoneNumber || phoneNumber || '';
      
      if (loginContext === 'login') {
        // For login, check if user exists and redirect accordingly (server, with client fallback)
        const userExistsResult = await checkUserExistsAction(phoneToCheck);
        if (userExistsResult.success && userExistsResult.userId) {
          router.push('/home');
        } else {
          // Fallback: try client Firestore in case server action couldn't access Admin SDK
          try {
            const { db } = await import('@/lib/firebase');
            if (db) {
              const { doc, getDoc } = await import('firebase/firestore');
              const snap = await getDoc(doc(db, 'users', phoneToCheck));
              if (snap.exists()) {
                router.push('/home');
                return;
              }
            }
          } catch (_) {
            // Ignore fallback errors; proceed to profile
          }
          // User doesn't exist, redirect to create profile
          router.push(`/create-profile?phone=${encodeURIComponent(phoneToCheck)}`);
        }
      } else { // context === 'signup' or default to signup flow
        // For signup, always go to create profile
        router.push(`/create-profile?phone=${encodeURIComponent(phoneToCheck)}`);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error("Firebase OTP verification error:", error);
      toast({ title: "Verification Failed", description: error.message || "Invalid OTP or verification expired.", variant: "destructive" });
      setOtp(new Array(NUM_OTP_INPUTS).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value)) && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < NUM_OTP_INPUTS - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '')) {
      handleSubmitOtp(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault(); 
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, NUM_OTP_INPUTS);
    if (pasteData.length === NUM_OTP_INPUTS) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      handleSubmitOtp(newOtp);
      inputRefs.current[NUM_OTP_INPUTS - 1]?.focus();
    } else if (pasteData.length > 0) {
      const currentFocusIndex = inputRefs.current.findIndex(ref => ref === document.activeElement);
      const actualFocusIndex = currentFocusIndex !== -1 ? currentFocusIndex : 0;
      const newOtp = [...otp];
      let pasteIdx = 0;
      for(let i = actualFocusIndex; i < NUM_OTP_INPUTS && pasteIdx < pasteData.length; i++){
        newOtp[i] = pasteData[pasteIdx++];
      }
      setOtp(newOtp);
      const nextFocus = Math.min(actualFocusIndex + pasteData.length, NUM_OTP_INPUTS - 1);
      inputRefs.current[nextFocus]?.focus();
       if (newOtp.every(digit => digit !== '')) {
         handleSubmitOtp(newOtp);
       }
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (isLoading) return;
    const currentIndex = otp.findIndex(val => val === '');
    if (currentIndex !== -1) {
      handleChange(currentIndex, digit);
    } else {
      const lastIndex = NUM_OTP_INPUTS -1;
      handleChange(lastIndex, digit)
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (isResending) return;
    
    setIsResending(true);
    try {
      // For now, just show a message since we don't have the original phone number
      toast({ title: "Info", description: "Please go back and request a new OTP", variant: "default" });
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast({ title: "Error", description: "Failed to resend OTP", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const clearOtp = () => {
    setOtp(new Array(NUM_OTP_INPUTS).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Phone verification container */}
      <div className="p-4 md:p-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-6" disabled={isLoading || isResending}>
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">We sent you an OTP</h1>
            <p className="text-muted-foreground">
              We have sent you an sms with the code to {phoneNumber}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Enter OTP Code</CardTitle>
              <CardDescription className="text-center">
                We've sent a verification code to your phone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OTP Input Fields */}
              <div className="flex justify-center space-x-2 mb-6">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                                         ref={(el) => {
                       inputRefs.current[index] = el;
                     }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={cn(
                      "w-12 h-12 text-center text-lg font-semibold",
                      digit ? "border-primary" : "border-muted-foreground"
                    )}
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Clear Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearOtp}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <ClearIcon className="h-4 w-4" />
                  <span>Clear</span>
                </Button>
              </div>

              {/* Timer and Resend */}
              <div className="text-center space-y-4">
                {timer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend OTP in {timer} seconds
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-primary"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Verifying OTP...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Numpad for mobile */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="lg"
                onClick={() => handleNumpadPress(digit.toString())}
                disabled={isLoading}
                className="h-16 text-lg font-semibold"
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleNumpadPress('0')}
              disabled={isLoading}
              className="h-16 text-lg font-semibold col-start-2"
            >
              0
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading OTP verification...</p>
        </div>
      </div>
    }>
      <OTPPageContent />
    </Suspense>
  );
}
