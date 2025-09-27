"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";

export default function PersonalInformationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+91");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [city, setCity] = React.useState("");
  const [vehicle, setVehicle] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const currentPhone = auth?.currentUser?.phoneNumber || "";
    if (!currentPhone) return;
    setCountryCode(currentPhone.startsWith("+") ? currentPhone.slice(0, 3) : "+91");
    setPhone(currentPhone.replace(/^\+\d{1,3}/, ""));
    (async () => {
      try {
        if (!db || !currentPhone) return;
        const snap = await getDoc(doc(db, "users", currentPhone));
        const data: any = snap.exists() ? snap.data() : null;
        const p = data?.profileData || {};
        setName(p.name || "");
        setEmail(p.email || "");
        setAddress(p.address || "");
        setGender(p.gender || "");
        setCity(p.city || "");
        const plate = Array.isArray(p.vehicleNumbers) ? p.vehicleNumbers[0] || "" : "";
        setVehicle(plate);
      } catch (e) {
        console.warn("Failed to load profile", e);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const fullPhone = `${countryCode}${phone}`;
      if (!db) throw new Error("Firestore not available");
      await updateDoc(doc(db, "users", fullPhone), {
        profileData: {
          name,
          phoneNumber: fullPhone,
          email: email || undefined,
          address: address || undefined,
          gender: gender || undefined,
          city: city || undefined,
          vehicleNumbers: vehicle ? [vehicle] : [],
        },
      });
      toast({ title: "Saved", description: "Profile updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4 md:p-6 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Personal Information</h1>
      </div>

      <div className="p-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div>
              <Label>Phone no</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[110px]"><SelectValue placeholder="+91" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">+91 (India)</SelectItem>
                    <SelectItem value="+1">+1 (USA/CAN)</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="Phone" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your full address" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle number</Label>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} placeholder="MH-01-AB-1234" />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save and Update"}</Button>
            <Button variant="ghost" className="w-full text-destructive" onClick={() => router.push('/home')}>Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



