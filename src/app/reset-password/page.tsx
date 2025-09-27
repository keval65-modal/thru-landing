
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyResetOtpAndSetNewPasswordAction } from '@/app/actions/auth';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordFormSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your new password." }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const phoneNumber = searchParams.get('phone');
  const verificationId = searchParams.get('verificationId'); // This is from Firebase OTP send

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!phoneNumber || !verificationId) {
      toast({ title: "Error", description: "Missing phone number or verification ID for password reset. Please start over.", variant: "destructive" });
      router.push('/forgot-password');
    }
  }, [phoneNumber, verificationId, router, toast]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!phoneNumber || !verificationId) {
        toast({ title: "Error", description: "Critical information missing. Cannot reset password.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    console.log(`[Client] ResetPassword: Submitting OTP ${data.otp} for ${phoneNumber} with verificationId ${verificationId}`);
    const result = await verifyResetOtpAndSetNewPasswordAction(
      phoneNumber,
      verificationId, // Pass the verificationId from Firebase
      data.otp,
      data.newPassword
    );
    setIsLoading(false);

    if (result.success) {
      toast({ title: "Password Reset Successful", description: result.message, variant: "default" });
      router.push("/login"); 
    } else {
      toast({ title: "Password Reset Failed", description: result.message || "Could not reset password.", variant: "destructive" });
      if (result.message?.toLowerCase().includes("invalid otp") || result.message?.toLowerCase().includes("invalid verification code")) {
        form.setError("otp", { type: "manual", message: "Invalid OTP. Please check and try again." });
      }
    }
  };
  
  const formattedPhoneNumber = React.useMemo(() => {
    if (!phoneNumber) return "your phone";
    // Basic formatting for display, assumes phoneNumber is E.164
    const justDigits = phoneNumber.replace('+', '');
    if (justDigits.length > 7) { // e.g. +91XXXXXXXXXX -> +91 XXXX XX XXXX
        const country = justDigits.substring(0, justDigits.length - 10);
        const lastFour = justDigits.slice(-4);
        const middlePart = justDigits.substring(justDigits.length - 10, justDigits.length -4).replace(/./g, '*');
        return `+${country} ${middlePart}${lastFour}`;
    }
    return phoneNumber;
  }, [phoneNumber]);


  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 pt-8 md:p-6">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="icon" onClick={() => router.push('/login')} className="absolute top-6 left-4 md:top-8 md:left-6">
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mt-10 text-center">
            <h1 className="text-3xl font-semibold text-foreground">Reset Your Password</h1>
            <p className="mt-2 text-muted-foreground">
              An OTP was sent to {formattedPhoneNumber}.
            </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter OTP <span className="text-primary">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      maxLength={6} 
                      placeholder="Enter 6-digit OTP" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password <span className="text-primary">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Enter new password" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormDescription>Must be at least 8 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password <span className="text-primary">*</span></FormLabel>
                   <FormControl>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Re-enter new password" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password & Login
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">Loading password reset...</p>
        </div>
      </div>
    }>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
    