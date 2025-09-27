
"use client";

import * as React from "react";
import { Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, UserCircle, Camera, PlusCircle, XCircle, CheckCircle2, Loader2 } from "lucide-react";
import { saveUserProfileAction } from "@/app/actions/user";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import bcrypt from "bcryptjs";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string(), // Will be pre-filled and read-only
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }).optional().or(z.literal('')),
  gender: z.string().optional(),
  city: z.string().optional(),
  vehicleNumbers: z.array(
    z.object({
      value: z.string().min(4, { message: "Vehicle number must be at least 4 characters." })
                       .regex(/^[A-Z0-9-]+$/, { message: "Invalid vehicle number format."}),
    })
  ).min(0),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path to field that gets the error
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function CreateProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const prefilledPhoneNumberFromQuery = searchParams.get("phone") || "";

  // Determine the values for the Select and Input display
  let selectValueForDisplay: string;
  let inputValueForDisplay: string;

  if (prefilledPhoneNumberFromQuery.startsWith("+91")) {
    selectValueForDisplay = "91"; // This matches <SelectItem value="91">
    inputValueForDisplay = prefilledPhoneNumberFromQuery.substring(3);
  } else if (prefilledPhoneNumberFromQuery.startsWith("+1")) {
    selectValueForDisplay = ""; // Will cause Select to use its placeholder
    inputValueForDisplay = prefilledPhoneNumberFromQuery.substring(2);
  } else if (prefilledPhoneNumberFromQuery.startsWith("+")) {
    selectValueForDisplay = ""; // Will cause Select to use its placeholder
    inputValueForDisplay = prefilledPhoneNumberFromQuery.substring(1); 
  } else {
    if (prefilledPhoneNumberFromQuery.length === 10 && /^\d+$/.test(prefilledPhoneNumberFromQuery)) {
      selectValueForDisplay = "91";
      inputValueForDisplay = prefilledPhoneNumberFromQuery;
    } else if (prefilledPhoneNumberFromQuery.length === 11 && prefilledPhoneNumberFromQuery.startsWith("1")) {
       selectValueForDisplay = ""; 
       inputValueForDisplay = prefilledPhoneNumberFromQuery.substring(1); 
    }
    else {
      selectValueForDisplay = ""; 
      inputValueForDisplay = prefilledPhoneNumberFromQuery; 
    }
  }


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: prefilledPhoneNumberFromQuery, // Keep original for submission
      email: "",
      password: "",
      confirmPassword: "",
      address: "",
      gender: "",
      city: "",
      vehicleNumbers: [{ value: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "vehicleNumbers",
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    console.log("Profile data submitted:", data);

    try {
      if (!db) {
        throw new Error("Firestore is not available on client");
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const userDoc = {
        hashedPassword,
        displayName: `${data.name},${data.phoneNumber}`, // Format: "UserName,Number"
        profileData: {
          name: data.name,
          phoneNumber: data.phoneNumber,
          email: data.email || undefined,
          address: data.address || undefined,
          gender: data.gender || undefined,
          city: data.city || undefined,
          vehicleNumbers: data.vehicleNumbers
            .map((v) => v.value)
            .filter((v) => v.trim() !== ""),
        },
      };

      await setDoc(doc(db, "users", data.phoneNumber), userDoc);

      // Update Firebase Auth user's displayName as well
      try {
        const { auth } = await import('@/lib/firebase');
        if (auth && auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: `${data.name},${data.phoneNumber}`
          });
          console.log(`[Create Profile] Updated Firebase Auth displayName: ${data.name},${data.phoneNumber}`);
        }
      } catch (authError) {
        console.warn("[Create Profile] Could not update Firebase Auth displayName:", authError);
        // Don't fail the entire process if this fails
      }

      toast({ title: "Profile Created!", description: "Saved to Firestore.", variant: "default" });
      router.push("/home");
      setIsLoading(false);
      return;
    } catch (clientErr) {
      console.warn("Client Firestore save failed, falling back to server action.", clientErr);
    }

    const result = await saveUserProfileAction({
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email || "",
      password: data.password,
      address: data.address || "",
      gender: data.gender || "",
      city: data.city || "",
      vehicleNumbers: data.vehicleNumbers.map((v) => v.value).filter((v) => Boolean(v) && v.trim() !== ""),
    });

    setIsLoading(false);

    if (result.success) {
      toast({ title: "Profile Created!", description: result.message, variant: "default" });
      router.push("/home");
    } else {
      toast({ title: "Error", description: result.message || "Could not create profile.", variant: "destructive" });
    }
  }

  React.useEffect(() => {
    // The form's `phoneNumber` field is already set by defaultValues.
    // The display values `selectValueForDisplay` and `inputValueForDisplay` are derived outside React's state
    // and used directly in JSX, so no need to form.setValue for them here.
  }, [prefilledPhoneNumberFromQuery, form]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4 md:p-6 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Create Profile</h1>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 pb-8 pt-2">
        <p className="text-sm text-muted-foreground mb-2">Almost done!</p>
        
        <div className="relative mb-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto">
            <UserCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <Button variant="outline" size="icon" className="absolute bottom-0 right-1/2 transform translate-x-8 rounded-full h-8 w-8 bg-background">
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-primary">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Phone no <span className="text-primary">*</span></FormLabel>
              <div className="flex items-center space-x-2">
                <Select defaultValue={selectValueForDisplay} disabled>
                  <SelectTrigger className="w-[80px]" aria-label="Country Code">
                     <SelectValue placeholder="+91" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="91">+91</SelectItem>
                    {/* Add other country codes here if needed, e.g., <SelectItem value="1">+1</SelectItem> */}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                 <Input
                    type="tel"
                    value={inputValueForDisplay}
                    readOnly
                    className="bg-muted/50"
                  />
                  <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                </div>
              </div>
               <FormMessage>{form.formState.errors.phoneNumber?.message}</FormMessage>
            </FormItem>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="eg. aman@google.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password <span className="text-primary">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter new password" {...field} />
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
                  <FormLabel>Confirm Password <span className="text-primary">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-enter new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mumbai">Mumbai</SelectItem>
                        <SelectItem value="delhi">Delhi</SelectItem>
                        <SelectItem value="bangalore">Bangalore</SelectItem>
                        <SelectItem value="pune">Pune</SelectItem>
                        <SelectItem value="hyderabad">Hyderabad</SelectItem>
                        <SelectItem value="chennai">Chennai</SelectItem>
                        <SelectItem value="kolkata">Kolkata</SelectItem>
                        <SelectItem value="ahmedabad">Ahmedabad</SelectItem>
                        <SelectItem value="jaipur">Jaipur</SelectItem>
                        <SelectItem value="surat">Surat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Vehicle number(s)</FormLabel>
              {fields.map((field, index) => (
                <FormField
                  control={form.control}
                  key={field.id}
                  name={`vehicleNumbers.${index}.value`}
                  render={({ field: itemField }) => (
                    <FormItem className="mt-2">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="eg. MH-01-AE-0000" 
                            {...itemField} 
                            onChange={(e) => itemField.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        {fields.length > 0 && ( 
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive"
                            aria-label="Remove vehicle number"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => append({ value: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
              <FormDescription className="mt-1">
                Vehicle number helps vendors find your vehicle and deliver the order. You can update it later.
              </FormDescription>
            </div>
            
            <Button type="submit" className="w-full py-3 text-base bg-red-600 hover:bg-red-700 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </form>
        </Form>
        <p className="mt-8 text-center text-xs text-muted-foreground">
           By creating an account, you agree to our <Link href="/terms" className="underline hover:text-primary">Terms & Conditions</Link>.
        </p>
      </div>
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading profile creation...</p>
        </div>
      </div>
    }>
      <CreateProfilePageContent />
    </Suspense>
  );
}