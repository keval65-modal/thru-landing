
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
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
import { ChevronLeft, HandMetal, Loader2, KeyRound } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { loginUserWithPasswordAction } from '@/app/actions/auth';

import { auth, sendOTPWithRecaptcha } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Placeholder SVG icons
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.94 11.06A10 10 0 1 0 12 22a10 10 0 0 0 8.94-10.94V11H12v2.5h4.94a4.47 4.47 0 0 1-1.94 2.72 5.88 5.88 0 0 1-4 1.28 6 6 0 0 1-5.66-4.07h2.24a3.5 3.5 0 0 0 3.42 2.5 3.37 3.37 0 0 0 2.3-.87l1.9 1.9a9.38 9.38 0 0 1-4.2 1.28 9.82 9.82 0 0 1-9.34-7A10 10 0 0 1 12 2a9.91 9.91 0 0 1 6.91 2.72L17 6.64A5.92 5.92 0 0 0 12 4a6 6 0 0 0-5.93 6h11.94Z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.12 4.48C14.27 4.48 13.3 4.88 12.61 5.5C11.93 4.88 11.03 4.48 10.13 4.48C8.25 4.48 7.44 6.04 7.44 7.5C7.44 8.34 7.76 9.13 8.36 9.83C8.6 10.14 8.91 10.49 9.31 10.89C7.48 11.84 6.14 13.64 6.14 15.89C6.14 18.63 8.36 20.5 10.59 20.5C11.48 20.5 12.44 20.23 13.12 19.6C13.8 20.23 14.71 20.5 15.6 20.5C17.83 20.5 20.05 18.63 20.05 15.89C20.05 13.6 18.67 11.77 16.88 10.89C17.28 10.49 17.59 10.14 17.83 9.83C18.43 9.13 18.75 8.34 18.75 7.5C18.75 6.04 17.94 4.48 16.06 4.48H15.12M11.95 2.5C12.78 2.5 13.37 3.21 13.37 4C13.37 4.79 12.78 5.5 11.95 5.5C11.12 5.5 10.53 4.79 10.53 4C10.53 3.21 11.12 2.5 11.95 2.5Z" />
  </svg>
);


const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [isLoadingPassword, setIsLoadingPassword] = React.useState(false);
  const [isOtpLoading, setIsOtpLoading] = React.useState(false);
  const [otpCooldown, setOtpCooldown] = React.useState(0);
  const cooldownRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (otpCooldown > 0) {
      cooldownRef.current = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [otpCooldown]);

  // Initialize phone verification
  React.useEffect(() => {
    console.log('Login page loaded');
  }, []);

  const isPhoneValid = /^\d{10}$/.test(phoneNumber);
  const isPasswordValid = password.length >= 8; 
  const canLoginWithPassword = isPhoneValid && isPasswordValid && !isLoadingPassword;
  const canLoginWithOtp = isPhoneValid && !isOtpLoading && otpCooldown === 0;

  const startCooldown = (seconds: number) => {
    setOtpCooldown(seconds);
  };

  const handleLoginWithPassword = async () => {
    if (!canLoginWithPassword) return;

    setIsLoadingPassword(true);
    const fullPhoneNumberForAction = countryCode + phoneNumber; 

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumberForAction, password }),
      });
      const data = await res.json();
      setIsLoadingPassword(false);

      if (!res.ok || !data.success) {
        toast({ title: "Login Failed", description: data.message || 'Invalid phone number or password.', variant: "destructive" });
        return;
      }

      if (!auth) throw new Error('Firebase auth not initialized');
      const { signInWithCustomToken } = await import('firebase/auth');
      await signInWithCustomToken(auth, data.token);

      toast({ title: "Login Successful!", description: 'Signed in securely.', variant: "default" });
      router.push("/home"); 
    } catch (e: any) {
      setIsLoadingPassword(false);
      console.error('Password login error:', e);
      toast({ title: "Login Failed", description: e.message || 'Unexpected error. Please try again.', variant: "destructive" });
    }
  };
  
  const handleLoginWithOtp = async () => {
    if (!canLoginWithOtp) return;

    setIsOtpLoading(true);
    const fullPhoneNumberForFirebase = countryCode + phoneNumber;

    try {
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      
      const confirmationResult = await sendOTPWithRecaptcha(fullPhoneNumberForFirebase, 'recaptcha-auto-container');
      setIsOtpLoading(false);
      toast({ title: "OTP Sent", description: `OTP sent to ${fullPhoneNumberForFirebase}`, variant: "default" });
      router.push(`/otp?phone=${encodeURIComponent(fullPhoneNumberForFirebase)}&verificationId=${encodeURIComponent(confirmationResult.verificationId)}&context=login`);
    } catch (error: any) {
      setIsOtpLoading(false);
      console.error("Firebase OTP send error (login):", error);
      if (error?.message?.toLowerCase().includes('too many requests') || error?.code === 'auth/too-many-requests') {
        startCooldown(60);
        toast({ title: "Slow down", description: "Too many requests. Please wait 60s before trying again.", variant: "destructive" });
      } else {
        toast({ title: "Login Failed", description: error.message || "Could not send OTP. Please try again.", variant: "destructive" });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }

      const currentUser = auth.currentUser;

      if (currentUser) {
        // User is signed in (e.g., via phone). Link Google to this account.
        try {
          const { linkWithPopup, GoogleAuthProvider: GAP } = await import('firebase/auth');
          await linkWithPopup(currentUser, googleProvider);
          toast({ title: "Google Linked!", description: "Your Google account has been linked.", variant: "default" });
          router.push("/home");
          return;
        } catch (linkErr: any) {
          if (linkErr?.code === 'auth/credential-already-in-use') {
            toast({ title: "Already Linked", description: "This Google account is already linked to another user.", variant: "destructive" });
          } else if (linkErr?.code === 'auth/popup-blocked') {
            const { linkWithRedirect } = await import('firebase/auth');
            await linkWithRedirect(currentUser, googleProvider);
            return;
          } else if (linkErr?.code === 'auth/internal-error') {
            toast({ title: "Google Sign-In Failed", description: "Please allow popups and third-party cookies, then try again.", variant: "destructive" });
          } else {
            toast({ title: "Google Link Failed", description: linkErr?.message || "Could not link Google account.", variant: "destructive" });
          }
          setIsGoogleLoading(false);
          return;
        }
      }

      // No existing session; sign in with Google
      const { signInWithPopup } = await import('firebase/auth');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      toast({ title: "Google Sign-In Successful!", description: `Welcome back ${user.displayName || 'User'}!`, variant: "default" });
      router.push("/home");
    } catch (error: any) {
      if (error?.code === 'auth/popup-blocked') {
        if (!auth) {
          toast({ title: "Google Sign-In Failed", description: "Auth not initialized.", variant: "destructive" });
          return;
        }
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, googleProvider);
      } else if (error?.code === 'auth/internal-error') {
        toast({ title: "Google Sign-In Failed", description: "Browser blocked the popup/cookies. Enable popups and try again.", variant: "destructive" });
      } else {
        console.error("Google Sign-In Full Error Object:", error); 
        toast({ title: "Google Sign-In Failed", description: error.message || "Could not sign in with Google.", variant: "destructive" });
      }
    } finally {
      setIsGoogleLoading(false);
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
            <h1 className="text-6xl font-bold text-primary" style={{WebkitTextStroke: '1.5px hsl(var(--primary-darker, var(--primary)))', paintOrder: 'stroke fill'}}>
              Thru
            </h1>
            <p className="mt-1 text-sm text-muted-foreground inline-flex items-center">
              Welcome back! <HandMetal className="ml-1 h-4 w-4" />
            </p>
        </div>

        <h2 className="mt-8 text-center text-3xl font-semibold text-foreground">
          Login to your Account
        </h2>

        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label htmlFor="phone-number" className="text-sm font-medium text-foreground">
              Phone no <span className="text-primary">*</span>
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

          <div>
            <Label htmlFor="password">
              Password <span className="text-primary">*</span>
            </Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
             <div className="text-right mt-1">
               <Button
                 variant="link"
                 size="sm"
                 className="p-0 h-auto text-xs"
                 onClick={() => router.push('/forgot-password')}
               >
                 Forgot Password?
               </Button>
             </div>
          </div>

          <Button type="button" onClick={handleLoginWithPassword} className="w-full" disabled={!canLoginWithPassword || isLoadingPassword || isOtpLoading || isGoogleLoading}>
            {isLoadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button> 

          <div className="text-center">
             <Button variant="link" onClick={handleLoginWithOtp} className="text-sm" disabled={!canLoginWithOtp || isLoadingPassword || isOtpLoading || isGoogleLoading}>
                {isOtpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login with OTP instead
              </Button>
          </div>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="mx-4 flex-shrink text-sm text-muted-foreground">OR</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoadingPassword || isOtpLoading}>
            {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <GoogleIcon />
            <span className="ml-2">Continue With Google</span>
          </Button> 
          <Button variant="outline" className="w-full" onClick={() => toast({ title: "Info", description: "Facebook login not yet implemented.", variant: "default"})} disabled={isLoadingPassword || isOtpLoading || isGoogleLoading}>
            <FacebookIcon />
            <span className="ml-2">Continue With Facebook</span>
          </Button> 
          <Button variant="outline" className="w-full" onClick={() => toast({ title: "Info", description: "Apple login not yet implemented.", variant: "default"})} disabled={isLoadingPassword || isOtpLoading || isGoogleLoading}>
            <AppleIcon />
            <span className="ml-2">Continue With Apple</span>
          </Button> 
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign Up 
          </Link>
        </p>
      </div>
    </div>
  );
}
