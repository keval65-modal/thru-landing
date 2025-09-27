
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOTPWithRecaptcha } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhoneNumber = countryCode + phoneNumber;
      console.log('📱 Sending OTP to:', fullPhoneNumber);
      
      const result = await sendOTPWithRecaptcha(fullPhoneNumber, 'recaptcha-auto-container');
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'OTP sent successfully!',
        });
        console.log('✅ OTP sent successfully');
        
        // Redirect to OTP page with signup context
        router.push(`/otp?phone=${encodeURIComponent(fullPhoneNumber)}&verificationId=${encodeURIComponent(result.verificationId)}&context=signup`);
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error: any) {
      console.error('❌ Error sending OTP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 pt-8 md:p-6">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute top-6 left-4 md:top-8 md:left-6">
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mt-10 text-center">
          <h1 className="text-6xl font-bold text-primary" style={{WebkitTextStroke: '1.5px hsl(var(--primary-darker, var(--primary)))', paintOrder: 'stroke fill'}}>
            Thru
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Sign Up
            </CardTitle>
            <CardDescription className="text-center">
              Enter your phone number to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                Phone Number <span className="text-primary">*</span>
              </label>
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
                  id="phone"
                  type="tel"
                  placeholder="Enter number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1 rounded-l-none"
                  maxLength={10}
                />
              </div>
            </div>
            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !phoneNumber}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" onClick={() => router.push('/login')} className="p-0 h-auto text-sm">
            Login
          </Button>
        </p>
      </div>
    </div>
  );
}
